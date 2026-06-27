"""Shot CRUD + 필터/정렬 + 연관 조회."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import activity, models, schemas, serializers
from ..database import get_db

router = APIRouter(prefix="/api/shots", tags=["shots"])

SORTABLE = {"code", "status", "cut_in", "cut_out", "created_at"}


def _apply_assets(shot: models.Shot, asset_ids, db: Session):
    if asset_ids is None:
        return
    shot.assets = [a for a in (db.get(models.Asset, i) for i in asset_ids) if a]


def _recalc_duration(shot: models.Shot):
    if shot.cut_in is not None and shot.cut_out is not None:
        shot.cut_duration = shot.cut_out - shot.cut_in + 1


@router.get("")
def list_shots(
    project_id: Optional[int] = None,
    sequence_id: Optional[int] = None,
    status: Optional[str] = Query(None, description="콤마 다중 상태 코드"),
    sort: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Shot)
    if project_id is not None:
        q = q.filter(models.Shot.project_id == project_id)
    if sequence_id is not None:
        q = q.filter(models.Shot.sequence_id == sequence_id)
    if status:
        q = q.filter(models.Shot.status.in_(status.split(",")))
    if sort:
        desc = sort.startswith("-")
        field = sort.lstrip("-")
        if field in SORTABLE:
            col = getattr(models.Shot, field)
            q = q.order_by(col.desc() if desc else col.asc())
    else:
        q = q.order_by(models.Shot.code)
    smap = serializers.status_map(db)
    stepmap = serializers.step_map(db)
    return [serializers.shot_dict(s, db, smap, stepmap) for s in q.all()]


@router.get("/{shot_id}")
def get_shot(shot_id: int, db: Session = Depends(get_db)):
    s = db.get(models.Shot, shot_id)
    if not s:
        raise HTTPException(404, f"Shot {shot_id} not found")
    return serializers.shot_dict(s, db)


@router.post("", status_code=201)
def create_shot(payload: schemas.ShotCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"asset_ids"})
    s = models.Shot(**data)
    _recalc_duration(s)
    db.add(s)
    db.flush()
    _apply_assets(s, payload.asset_ids, db)
    db.commit()
    db.refresh(s)
    return serializers.shot_dict(s, db)


@router.patch("/{shot_id}")
def update_shot(shot_id: int, payload: schemas.ShotUpdate, db: Session = Depends(get_db)):
    s = db.get(models.Shot, shot_id)
    if not s:
        raise HTTPException(404, f"Shot {shot_id} not found")
    data = payload.model_dump(exclude_unset=True)
    asset_ids = data.pop("asset_ids", None)
    cf = data.pop("custom_fields", None)
    old_status, old_desc = s.status, s.description
    for k, v in data.items():
        setattr(s, k, v)
    if cf is not None:
        merged = dict(s.custom_fields or {})
        merged.update(cf)
        s.custom_fields = merged
    _recalc_duration(s)
    _apply_assets(s, asset_ids, db)
    if "status" in data and data["status"] != old_status:
        activity.record_event(
            db, project_id=s.project_id, entity_type="Shot", entity_id=s.id,
            event_type="status_change", attribute="status",
            old_value=activity.status_name(db, old_status), new_value=activity.status_name(db, s.status),
            message=f"changed Status: {activity.status_name(db, old_status)} → {activity.status_name(db, s.status)}",
        )
    if "description" in data and data["description"] != old_desc:
        activity.record_event(
            db, project_id=s.project_id, entity_type="Shot", entity_id=s.id,
            event_type="field_change", attribute="description",
            message="edited Description",
        )
    db.commit()
    db.refresh(s)
    return serializers.shot_dict(s, db)


@router.delete("/{shot_id}", status_code=204)
def delete_shot(shot_id: int, db: Session = Depends(get_db)):
    s = db.get(models.Shot, shot_id)
    if not s:
        raise HTTPException(404, f"Shot {shot_id} not found")
    db.delete(s)
    db.commit()


@router.get("/{shot_id}/tasks")
def shot_tasks(shot_id: int, db: Session = Depends(get_db)):
    rows = db.query(models.Task).filter_by(entity_type="Shot", entity_id=shot_id).all()
    smap = serializers.status_map(db)
    stepmap = serializers.step_map(db)
    return [serializers.task_dict(t, db, smap, stepmap) for t in rows]


@router.get("/{shot_id}/versions")
def shot_versions(shot_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Version)
        .filter_by(entity_type="Shot", entity_id=shot_id)
        .order_by(models.Version.created_at.desc())
        .all()
    )
    smap = serializers.status_map(db)
    return [serializers.version_dict(v, db, smap) for v in rows]
