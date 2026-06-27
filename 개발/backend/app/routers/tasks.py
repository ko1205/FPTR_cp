"""Task CRUD + 담당자 할당 + My Tasks.

PATCH 로 status / assignee_ids 를 바꾸는 것이 원본 FPTR 그리드 인라인 편집의 핵심.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import activity, models, schemas, serializers
from ..database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _apply_assignees(task: models.Task, assignee_ids, db: Session):
    if assignee_ids is None:
        return
    task.assignees = [u for u in (db.get(models.HumanUser, i) for i in assignee_ids) if u]


@router.get("")
def list_tasks(
    project_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    status: Optional[str] = Query(None),
    step_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Task)
    if project_id is not None:
        q = q.filter(models.Task.project_id == project_id)
    if entity_type:
        q = q.filter(models.Task.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(models.Task.entity_id == entity_id)
    if status:
        q = q.filter(models.Task.status.in_(status.split(",")))
    if step_id is not None:
        q = q.filter(models.Task.step_id == step_id)
    if assignee_id is not None:
        q = q.filter(models.Task.assignees.any(models.HumanUser.id == assignee_id))
    smap = serializers.status_map(db)
    stepmap = serializers.step_map(db)
    return [serializers.task_dict(t, db, smap, stepmap) for t in q.order_by(models.Task.id).all()]


@router.get("/my")
def my_tasks(user_id: int, db: Session = Depends(get_db)):
    """로그인 사용자에게 할당된 태스크 (My Tasks)."""
    q = db.query(models.Task).filter(models.Task.assignees.any(models.HumanUser.id == user_id))
    smap = serializers.status_map(db)
    stepmap = serializers.step_map(db)
    return [serializers.task_dict(t, db, smap, stepmap) for t in q.order_by(models.Task.due_date).all()]


@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    t = db.get(models.Task, task_id)
    if not t:
        raise HTTPException(404, f"Task {task_id} not found")
    return serializers.task_dict(t, db)


@router.post("", status_code=201)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"assignee_ids"})
    t = models.Task(**data)
    db.add(t)
    db.flush()
    _apply_assignees(t, payload.assignee_ids, db)
    db.commit()
    db.refresh(t)
    return serializers.task_dict(t, db)


@router.patch("/{task_id}")
def update_task(task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db)):
    t = db.get(models.Task, task_id)
    if not t:
        raise HTTPException(404, f"Task {task_id} not found")
    data = payload.model_dump(exclude_unset=True)
    assignee_ids = data.pop("assignee_ids", None)
    old_status = t.status
    for k, v in data.items():
        setattr(t, k, v)
    _apply_assignees(t, assignee_ids, db)
    if "status" in data and data["status"] != old_status:
        step = db.get(models.Step, t.step_id) if t.step_id else None
        step_name = step.name if step else "Task"
        # 부모(Shot/Asset)의 Activity 에 보이도록 부모 엔티티에 기록
        activity.record_event(
            db, project_id=t.project_id, entity_type=t.entity_type, entity_id=t.entity_id,
            event_type="status_change", attribute="task_status",
            old_value=activity.status_name(db, old_status), new_value=activity.status_name(db, t.status),
            message=f"{step_name} task → {activity.status_name(db, t.status)}",
        )
    db.commit()
    db.refresh(t)
    return serializers.task_dict(t, db)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    t = db.get(models.Task, task_id)
    if not t:
        raise HTTPException(404, f"Task {task_id} not found")
    db.delete(t)
    db.commit()
