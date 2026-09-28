import os
import logging
import importlib

from pathlib import Path


class RouterManager:
    def __init__(self, app):
        self.script_directory = os.path.dirname(os.path.abspath(__file__))
        self.project_root = Path(self.script_directory).parent
        self.app = app

    def import_routers(self):
        apps_directory = self.project_root / "apps"

        for app_dir in apps_directory.iterdir():
            if app_dir.is_dir():
                routers_file = app_dir / "routers.py"
                if routers_file.exists():
                    module_name = f"apps.{app_dir.name}.routers"
                    try:
                        module = importlib.import_module(module_name)
                        if hasattr(module, "router"):
                            self.app.include_router(module.router)
                    except ImportError as e:
                        logging.error(f"Error importing module {module_name}: {e}")
