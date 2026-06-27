"""Activity / History 조회 API."""
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import activity, models
from ..database import get_db

router = APIRouter(prefix="/api/activity", tags=["activity"])


# 엔티티별 표시용 라벨 컬럼 (Shot=code, Task=content ...)
_LABEL_ATTR = {
    "Shot": "code",
    "Asset": "code",
    "Version": "code",
    "Playlist": "code",
    "Task": "content",
    "Note": "subject",
    "Project": "code",
}


def _enrich(rows, db: Session):
    """이벤트에 project(code/name) + entity_label(엔티티 표시명) 부착 — 전역 Inbox 표시용."""
    # 프로젝트 배치 조회
    proj_ids = {e.project_id for e in rows if e.project_id is not None}
    projects = {
        p.id: {"id": p.id, "code": p.code, "name": p.name}
        for p in db.query(models.Project).filter(models.Project.id.in_(proj_ids)).all()
    } if proj_ids else {}

    # 엔티티명 배치 조회 (타입별)
    by_type = {}
    for e in rows:
        by_type.setdefault(e.entity_type, set()).add(e.entity_id)
    labels = {}
    for etype, ids in by_type.items():
        model = getattr(models, etype, None)
        attr = _LABEL_ATTR.get(etype)
        if model is None or attr is None:
            continue
        for obj in db.query(model).filter(model.id.in_(ids)).all():
            val = getattr(obj, attr, None)
            labels[(etype, obj.id)] = (str(val)[:40] if val else "#%d" % obj.id)

    out = []
    for e in rows:
        d = activity.event_dict(e)
        d["project"] = projects.get(e.project_id)
        d["entity_label"] = labels.get((e.entity_type, e.entity_id)) or ("#%d" % e.entity_id)
        out.append(d)
    return out


@router.get("/global")
def global_activity(limit: int = 100, db: Session = Depends(get_db)):
    """전 프로젝트 최근 활동 (전역 Inbox 용). project/entity 표시명 enrich."""
    rows = (
        db.query(models.EventLog)
        .order_by(models.EventLog.created_at.desc(), models.EventLog.id.desc())
        .limit(limit)
        .all()
    )
    return _enrich(rows, db)


@router.get("")
def project_activity(project_id: int, limit: int = 50, db: Session = Depends(get_db)):
    """프로젝트 전체 최근 활동 (Inbox 용)."""
    rows = (
        db.query(models.EventLog)
        .filter(models.EventLog.project_id == project_id)
        .order_by(models.EventLog.created_at.desc(), models.EventLog.id.desc())
        .limit(limit)
        .all()
    )
    return [activity.event_dict(e) for e in rows]


@router.get("/entity/{entity_type}/{entity_id}")
def entity_activity(entity_type: str, entity_id: int, db: Session = Depends(get_db)):
    """특정 엔티티의 활동 (detail Activity 탭)."""
    rows = (
        db.query(models.EventLog)
        .filter(
            models.EventLog.entity_type == entity_type,
            models.EventLog.entity_id == entity_id,
        )
        .order_by(models.EventLog.created_at.desc(), models.EventLog.id.desc())
        .all()
    )
    return [activity.event_dict(e) for e in rows]
