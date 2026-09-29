import os
import importlib

from pathlib import Path
from fastapi import HTTPException
from operator import and_
from sqlalchemy import URL, MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Query, Session, sessionmaker

from . import settings

testing = False


class DatabaseManager:
    engine: create_engine = None
    session: Session = None

    @classmethod
    def __init__(cls):
        global testing
        db_config = settings.DATABASES.copy()
        if testing:
            db_config["database"] = "test_" + db_config["database"]

        if db_config["drivername"] == "sqlite":
            # SQLite URLs cannot carry PostgreSQL host, credential, or port fields.
            db_config.update(username=None, password=None, host=None, port=None)
            project_root = Path(
                __file__
            ).parent.parent  # Assuming this is where your models are located
            db_config["database"] = os.path.join(project_root, db_config["database"])

            url = URL.create(**db_config)
            cls.engine = create_engine(url, connect_args={"check_same_thread": False})

            # Enforce declared cascade behavior in SQLite test and local databases.
            @event.listens_for(cls.engine, "connect")
            def enable_sqlite_foreign_keys(connection, _):
                connection.execute("PRAGMA foreign_keys=ON")
        else:
            cls.engine = create_engine(URL.create(**db_config))

        session = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        cls.session = session()

    @classmethod
    def create_test_database(cls):

        global testing
        testing = True

        cls.__init__()
        DatabaseManager.create_database_tables()

    @classmethod
    def drop_all_tables(cls):
        if cls.engine:
            metadata = MetaData()
            metadata.reflect(bind=cls.engine)
            for table_name, table in metadata.tables.items():
                table.drop(cls.engine)

    @classmethod
    def create_database_tables(cls):
        script_directory = os.path.dirname(os.path.abspath(__file__))
        project_root = Path(script_directory).parent
        apps_directory = project_root / "apps"

        for app_dir in apps_directory.iterdir():
            if app_dir.is_dir():
                models_file = app_dir / "models.py"
                if models_file.exists():
                    module_name = f"apps.{app_dir.name}.models"
                    try:
                        module = importlib.import_module(module_name)
                        if hasattr(module, "FastModel") and hasattr(
                            module.FastModel, "metadata"
                        ):
                            module.FastModel.metadata.create_all(bind=cls.engine)
                    except ImportError:
                        pass

                migrations_file = app_dir / "migrations.py"
                if migrations_file.exists():
                    migration_module = importlib.import_module(f"apps.{app_dir.name}.migrations")
                    migration_module.apply(cls.engine)

    @classmethod
    def get_testing_mode(cls):
        return testing


class FastModel(DeclarativeBase):

    @classmethod
    def __eq__(cls, **kwargs):
        filter_conditions = [
            getattr(cls, key) == value for key, value in kwargs.items()
        ]
        return and_(*filter_conditions) if filter_conditions else True

    @classmethod
    def create(cls, **kwargs):
        instance = cls(**kwargs)
        session = DatabaseManager.session
        try:
            session.add(instance)
            session.commit()
            session.refresh(instance)
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
        return instance

    @classmethod
    def filter(cls, condition):
        with DatabaseManager.session as session:
            query: Query = session.query(cls).filter(condition)
        return query

    @classmethod
    def get(cls, pk):
        with DatabaseManager.session as session:
            instance = session.get(cls, pk)
        return instance

    @classmethod
    def get_or_404(cls, pk):
        with DatabaseManager.session as session:
            instance = session.get(cls, pk)
            if not instance:
                raise HTTPException(status_code=404, detail=f"{cls.__name__} not found")
        return instance

    @classmethod
    def update(cls, pk, **kwargs):
        with DatabaseManager.session as session:
            instance = session.get(cls, pk)
            if not instance:
                raise HTTPException(status_code=404, detail=f"{cls.__name__} not found")
            for key, value in kwargs.items():
                setattr(instance, key, value)

            try:
                session.commit()
                session.refresh(instance)
            except Exception:
                session.rollback()
                raise
        return instance

    @staticmethod
    def delete(instance):

        with DatabaseManager.session as session:

            session.delete(instance)

            try:
                session.commit()
            except Exception:
                session.rollback()
                raise
