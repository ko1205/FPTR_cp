"""커스텀필드 정의 CRUD (프로젝트 + 엔티티 타입별).

협업 결론(Gemini/GPT-5.5 합의)에 따라 커스텀필드 스키마를 DB에 둔다.
값은 각 엔티티의 custom_fields JSON 에 저장(엔티티 PATCH 로 병합).
"""
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/custom_fields", tags=["custom_fields"])


def _slug(label: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")
    return s or "field"


def _dict(d: models.CustomFieldDef):
    return {
        "id": d.id,
        "project_id": d.project_id,
        "entity_type": d.entity_type,
        "field_id": d.field_id,
        "label": d.label,
        "type": d.type,
    }


@router.get("")
def list_defs(
    project_id: int,
    entity_type: str = Query(..., description="'Shot' or 'Asset'"),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.CustomFieldDef)
        .filter_by(project_id=project_id, entity_type=entity_type)
        .order_by(models.CustomFieldDef.id)
        .all()
    )
    return [_dict(d) for d in rows]


@router.post("", status_code=201)
def create_def(payload: schemas.CustomFieldDefCreate, db: Session = Depends(get_db)):
    field_id = payload.field_id or _slug(payload.label)
    exists = (
        db.query(models.CustomFieldDef)
        .filter_by(project_id=payload.project_id, entity_type=payload.entity_type, field_id=field_id)
        .first()
    )
    if exists:
        raise HTTPException(400, f"Custom field '{field_id}' already exists")
    d = models.CustomFieldDef(
        project_id=payload.project_id,
        entity_type=payload.entity_type,
        field_id=field_id,
        label=payload.label,
        type=payload.type,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _dict(d)


@router.delete("/{def_id}", status_code=204)
def delete_def(def_id: int, db: Session = Depends(get_db)):
    d = db.get(models.CustomFieldDef, def_id)
    if not d:
        raise HTTPException(404, f"CustomFieldDef {def_id} not found")
    db.delete(d)
    db.commit()
