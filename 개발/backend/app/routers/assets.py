"""Asset CRUD + 필터 + 연관 조회."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import activity, models, schemas, serializers
from ..database import get_db

router = APIRouter(prefix="/api/assets", tags=["assets"])

SORTABLE = {"code", "asset_type", "status", "created_at"}


@router.get("")
def list_assets(
    project_id: Optional[int] = None,
    asset_type: Optional[str] = None,
    status: Optional[str] = Query(None),
    sort: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Asset)
    if project_id is not None:
        q = q.filter(models.Asset.project_id == project_id)
    if asset_type:
        q = q.filter(models.Asset.asset_type == asset_type)
    if status:
        q = q.filter(models.Asset.status.in_(status.split(",")))
    if sort:
        desc = sort.startswith("-")
        field = sort.lstrip("-")
        if field in SORTABLE:
            col = getattr(models.Asset, field)
            q = q.order_by(col.desc() if desc else col.asc())
    else:
        q = q.order_by(models.Asset.code)
    smap = serializers.status_map(db)
    stepmap = serializers.step_map(db)
    return [serializers.asset_dict(a, db, smap, stepmap) for a in q.all()]


@router.get("/{asset_id}")
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    a = db.get(models.Asset, asset_id)
    if not a:
        raise HTTPException(404, f"Asset {asset_id} not found")
    return serializers.asset_dict(a, db)


@router.post("", status_code=201)
def create_asset(payload: schemas.AssetCreate, db: Session = Depends(get_db)):
    a = models.Asset(**payload.model_dump())
    db.add(a)
    db.flush()
    activity.record_event(
        db, project_id=a.project_id, entity_type="Asset", entity_id=a.id,
        event_type="created", message=f"created Asset {a.code}",
    )
    db.commit()
    db.refresh(a)
    return serializers.asset_dict(a, db)


@router.post("/batch", status_code=201)
def batch_create_assets(payload: List[schemas.AssetCreate], db: Session = Depends(get_db)):
    """여러 Asset 일괄 생성 (all-or-nothing 단일 트랜잭션, 엔티티당 created 이벤트)."""
    if not payload:
        raise HTTPException(422, "빈 배치입니다.")
    created = []
    for item in payload:
        a = models.Asset(**item.model_dump())
        db.add(a)
        db.flush()
        activity.record_event(
            db, project_id=a.project_id, entity_type="Asset", entity_id=a.id,
            event_type="created", message=f"created Asset {a.code}",
        )
        created.append(a)
    db.commit()
    smap = serializers.status_map(db)
    stepmap = serializers.step_map(db)
    return {
        "created": [serializers.asset_dict(a, db, smap, stepmap) for a in created],
        "count": len(created),
    }


@router.post("/batch-delete")
def batch_delete_assets(payload: schemas.IdList, db: Session = Depends(get_db)):
    """여러 Asset 일괄 삭제 (존재하는 것만, 엔티티당 deleted 이벤트, 단일 커밋)."""
    if not payload.ids:
        raise HTTPException(422, "빈 id 목록입니다.")
    rows = db.query(models.Asset).filter(models.Asset.id.in_(payload.ids)).all()
    if not rows:
        raise HTTPException(404, "삭제할 Asset 이 없습니다.")
    deleted_ids = []
    for a in rows:
        activity.record_event(
            db, project_id=a.project_id, entity_type="Asset", entity_id=a.id,
            event_type="deleted", message=f"deleted Asset {a.code}",
        )
        deleted_ids.append(a.id)
        db.delete(a)
    db.commit()
    return {"deleted_ids": deleted_ids, "count": len(deleted_ids)}


@router.patch("/{asset_id}")
def update_asset(asset_id: int, payload: schemas.AssetUpdate, db: Session = Depends(get_db)):
    a = db.get(models.Asset, asset_id)
    if not a:
        raise HTTPException(404, f"Asset {asset_id} not found")
    data = payload.model_dump(exclude_unset=True)
    cf = data.pop("custom_fields", None)
    old_status, old_desc = a.status, a.description
    for k, v in data.items():
        setattr(a, k, v)
    if cf is not None:
        merged = dict(a.custom_fields or {})
        merged.update(cf)
        a.custom_fields = merged
    if "status" in data and data["status"] != old_status:
        activity.record_event(
            db, project_id=a.project_id, entity_type="Asset", entity_id=a.id,
            event_type="status_change", attribute="status",
            old_value=activity.status_name(db, old_status), new_value=activity.status_name(db, a.status),
            message=f"changed Status: {activity.status_name(db, old_status)} → {activity.status_name(db, a.status)}",
        )
    if "description" in data and data["description"] != old_desc:
        activity.record_event(
            db, project_id=a.project_id, entity_type="Asset", entity_id=a.id,
            event_type="field_change", attribute="description", message="edited Description",
        )
    db.commit()
    db.refresh(a)
    return serializers.asset_dict(a, db)


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    a = db.get(models.Asset, asset_id)
    if not a:
        raise HTTPException(404, f"Asset {asset_id} not found")
    activity.record_event(
        db, project_id=a.project_id, entity_type="Asset", entity_id=a.id,
        event_type="deleted", message=f"deleted Asset {a.code}",
    )
    db.delete(a)
    db.commit()


@router.get("/{asset_id}/tasks")
def asset_tasks(asset_id: int, db: Session = Depends(get_db)):
    rows = db.query(models.Task).filter_by(entity_type="Asset", entity_id=asset_id).all()
    smap = serializers.status_map(db)
    stepmap = serializers.step_map(db)
    return [serializers.task_dict(t, db, smap, stepmap) for t in rows]


@router.get("/{asset_id}/versions")
def asset_versions(asset_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Version)
        .filter_by(entity_type="Asset", entity_id=asset_id)
        .order_by(models.Version.created_at.desc())
        .all()
    )
    smap = serializers.status_map(db)
    return [serializers.version_dict(v, db, smap) for v in rows]
