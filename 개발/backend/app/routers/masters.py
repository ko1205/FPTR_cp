"""마스터 데이터: 상태(Status), 스텝(Step), 사용자(HumanUser)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, serializers
from ..database import get_db

router = APIRouter(prefix="/api", tags=["masters"])


@router.get("/statuses")
def list_statuses(db: Session = Depends(get_db)):
    rows = db.query(models.Status).order_by(models.Status.sort_order).all()
    return [serializers.status_dict(s) for s in rows]


@router.get("/steps")
def list_steps(db: Session = Depends(get_db)):
    rows = db.query(models.Step).order_by(models.Step.id).all()
    return [serializers.step_dict(s) for s in rows]


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    rows = db.query(models.HumanUser).order_by(models.HumanUser.name).all()
    return [serializers.user_dict(u) for u in rows]
