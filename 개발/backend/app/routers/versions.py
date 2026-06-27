"""Version CRUD (리뷰 대상 미디어)."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import activity, models, schemas, serializers
from ..database import get_db

router = APIRouter(prefix="/api/versions", tags=["versions"])


@router.get("")
def list_versions(
    project_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    task_id: Optional[int] = None,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Version)
    if project_id is not None:
        q = q.filter(models.Version.project_id == project_id)
    if entity_type:
        q = q.filter(models.Version.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(models.Version.entity_id == entity_id)
    if task_id is not None:
        q = q.filter(models.Version.task_id == task_id)
    if status:
        q = q.filter(models.Version.status.in_(status.split(",")))
    smap = serializers.status_map(db)
    rows = q.order_by(models.Version.created_at.desc()).all()
    return [serializers.version_dict(v, db, smap) for v in rows]


@router.get("/{version_id}")
def get_version(version_id: int, db: Session = Depends(get_db)):
    v = db.get(models.Version, version_id)
    if not v:
        raise HTTPException(404, f"Version {version_id} not found")
    return serializers.version_dict(v, db)


@router.post("", status_code=201)
def create_version(payload: schemas.VersionCreate, db: Session = Depends(get_db)):
    v = models.Version(**payload.model_dump())
    db.add(v)
    db.flush()
    if v.entity_type and v.entity_id:
        activity.record_event(
            db, project_id=v.project_id, entity_type=v.entity_type, entity_id=v.entity_id,
            event_type="version", message=f"submitted Version {v.code}",
            user_id=v.user_id,
        )
    db.commit()
    db.refresh(v)
    return serializers.version_dict(v, db)


@router.patch("/{version_id}")
def update_version(version_id: int, payload: schemas.VersionUpdate, db: Session = Depends(get_db)):
    v = db.get(models.Version, version_id)
    if not v:
        raise HTTPException(404, f"Version {version_id} not found")
    for k, val in payload.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    return serializers.version_dict(v, db)


@router.delete("/{version_id}", status_code=204)
def delete_version(version_id: int, db: Session = Depends(get_db)):
    v = db.get(models.Version, version_id)
    if not v:
        raise HTTPException(404, f"Version {version_id} not found")
    db.delete(v)
    db.commit()
