"""활동 이력 기록 헬퍼 (Activity / History).

라우터에서 명시적으로 호출하여 EventLog 를 남긴다(협업 결론: 리스너/미들웨어 미사용).
commit 은 도메인 변경과 같은 트랜잭션에서 수행된다.
"""
from sqlalchemy.orm import Session

from . import models


def status_name(db: Session, code) -> str:
    if not code:
        return "—"
    st = db.get(models.Status, code)
    return st.name if st else str(code)


def record_event(
    db: Session,
    *,
    project_id,
    entity_type: str,
    entity_id: int,
    event_type: str,
    message: str,
    attribute: str = None,
    old_value=None,
    new_value=None,
    user_id=None,
):
    """이벤트 1건 기록 (flush 만; commit 은 호출측 트랜잭션에서)."""
    ev = models.EventLog(
        project_id=project_id,
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        attribute=attribute,
        old_value=None if old_value is None else str(old_value),
        new_value=None if new_value is None else str(new_value),
        message=message,
        user_id=user_id,
    )
    db.add(ev)
    return ev


def event_dict(e: models.EventLog):
    return {
        "id": e.id,
        "project_id": e.project_id,
        "entity_type": e.entity_type,
        "entity_id": e.entity_id,
        "event_type": e.event_type,
        "attribute": e.attribute,
        "old_value": e.old_value,
        "new_value": e.new_value,
        "message": e.message,
        "user": (
            {"id": e.user.id, "name": e.user.name, "color": e.user.color} if e.user else None
        ),
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
