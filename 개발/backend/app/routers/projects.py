"""Project CRUD + 대시보드 통계."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, serializers
from ..database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    rows = db.query(models.Project).order_by(models.Project.id).all()
    return [serializers.project_dict(p, db) for p in rows]


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Project, project_id)
    if not p:
        raise HTTPException(404, f"Project {project_id} not found")
    return serializers.project_dict(p, db)


@router.post("", status_code=201)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    p = models.Project(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return serializers.project_dict(p, db)


@router.patch("/{project_id}")
def update_project(project_id: int, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    p = db.get(models.Project, project_id)
    if not p:
        raise HTTPException(404, f"Project {project_id} not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return serializers.project_dict(p, db)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Project, project_id)
    if not p:
        raise HTTPException(404, f"Project {project_id} not found")
    db.delete(p)
    db.commit()


@router.get("/{project_id}/stats")
def project_stats(project_id: int, db: Session = Depends(get_db)):
    """대시보드용: 엔티티 카운트 + 상태 분포."""
    p = db.get(models.Project, project_id)
    if not p:
        raise HTTPException(404, f"Project {project_id} not found")

    from sqlalchemy import func

    def status_breakdown(model):
        q = (
            db.query(model.status, func.count(model.id))
            .filter(model.project_id == project_id)
            .group_by(model.status)
            .all()
        )
        return {code: cnt for code, cnt in q}

    return {
        "project_id": project_id,
        "counts": {
            "sequences": db.query(models.Sequence).filter_by(project_id=project_id).count(),
            "shots": db.query(models.Shot).filter_by(project_id=project_id).count(),
            "assets": db.query(models.Asset).filter_by(project_id=project_id).count(),
            "tasks": db.query(models.Task).filter_by(project_id=project_id).count(),
            "versions": db.query(models.Version).filter_by(project_id=project_id).count(),
        },
        "shot_status": status_breakdown(models.Shot),
        "asset_status": status_breakdown(models.Asset),
        "task_status": status_breakdown(models.Task),
    }
