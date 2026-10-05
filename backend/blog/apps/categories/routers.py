"""Admin category CRUD."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from apps.auth.services import require_admin
from apps.blogs.models import Blog
from apps.blogs.services.blog import BlogServices
from apps.categories.models import Category
from apps.core.date_time import DateTime

router = APIRouter(prefix="/categories", tags=["Categories"])


class CategoryInput(BaseModel):
    """Validate a human-managed category name."""

    name: str = Field(min_length=1, max_length=120)


# List active categories in a bounded stable order, with the count of active Blogs using each.
@router.get("")
def list_categories(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    sort: Literal["modified", "name"] = "name",
    dir: Literal["asc", "desc"] = "asc",
    _: str = Depends(require_admin),
):
    query = Category.filter(Category.deleted_at.is_(None))
    total = query.count()
    column = Category.modified_at if sort == "modified" else Category.name
    order = (column.desc(), Category.id.desc()) if dir == "desc" else (column.asc(), Category.id.asc())
    items = query.order_by(*order).offset((page - 1) * pageSize).limit(pageSize).all()
    # Count usage for the page in one grouped query instead of one query per row.
    with BlogServices.get_db_session() as session:
        counts = dict(session.execute(select(Blog.category_id, func.count(Blog.id)).where(Blog.deleted_at.is_(None), Blog.category_id.in_([item.id for item in items])).group_by(Blog.category_id)).all())
    return {"items": [{"id": item.id, "name": item.name, "slug": item.slug, "createdAt": item.created_at, "modifiedAt": item.modified_at, "usageCount": counts.get(item.id, 0)} for item in items], "page": page, "pageSize": pageSize, "total": total, "totalPages": (total + pageSize - 1) // pageSize}


# Create or restore a category; strict=true rejects a name that is already active.
@router.post("")
def create_category(data: CategoryInput, strict: bool = False, _: str = Depends(require_admin)):
    category = BlogServices.resolve_category(data.name, strict=strict)
    return {"id": category.id, "name": category.name, "slug": category.slug}


# Rename an active category and keep its slug and denormalized Blog label aligned.
@router.put("/{category_id}")
def update_category(category_id: str, data: CategoryInput, _: str = Depends(require_admin)):
    name = data.name.strip()
    slug = BlogServices._category_slug(name)
    with BlogServices.get_db_session() as session:
        category = session.query(Category).filter(
            Category.id == category_id, Category.deleted_at.is_(None)
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        conflict = session.query(Category).filter(
            Category.slug == slug, Category.id != category_id
        ).first()
        if conflict:
            raise HTTPException(status_code=409, detail="Category slug already exists")
        category.name, category.slug = name, slug
        session.query(Blog).filter(Blog.category_id == category_id).update(
            {Blog.category: name}, synchronize_session=False
        )
        try:
            session.commit()
        except IntegrityError as error:
            session.rollback()
            raise HTTPException(status_code=409, detail="Category slug already exists") from error
        session.refresh(category)
        return category


# Soft-delete a category without rewriting existing Blog records.
@router.delete("/{category_id}")
def delete_category(category_id: str, _: str = Depends(require_admin)):
    category = Category.get(category_id)
    if not category or category.deleted_at:
        raise HTTPException(status_code=404, detail="Category not found")
    Category.update(category.id, deleted_at=DateTime.now())
    return {"message": "Category deleted"}


# Restore a category without changing any Blog assignment.
@router.post("/{category_id}/restore")
def restore_category(category_id: str, _: str = Depends(require_admin)):
    category = Category.get(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category.update(category.id, deleted_at=None)
