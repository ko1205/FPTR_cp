"""Sequence CRUD."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, serializers
from ..database import get_db

router = APIRouter(prefix="/api/sequences", tags=["sequences"])


@router.get("")
def list_sequences(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Sequence)
    if project_id is not None:
        q = q.filter(models.Sequence.project_id == project_id)
    rows = q.order_by(models.Sequence.code).all()
    return [serializers.sequence_dict(s, db) for s in rows]


@router.get("/{seq_id}")
def get_sequence(seq_id: int, db: Session = Depends(get_db)):
    s = db.get(models.Sequence, seq_id)
    if not s:
        raise HTTPException(404, f"Sequence {seq_id} not found")
    return serializers.sequence_dict(s, db)


@router.post("", status_code=201)
def create_sequence(payload: schemas.SequenceCreate, db: Session = Depends(get_db)):
    s = models.Sequence(**payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return serializers.sequence_dict(s, db)


@router.patch("/{seq_id}")
def update_sequence(seq_id: int, payload: schemas.SequenceUpdate, db: Session = Depends(get_db)):
    s = db.get(models.Sequence, seq_id)
    if not s:
        raise HTTPException(404, f"Sequence {seq_id} not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return serializers.sequence_dict(s, db)


@router.delete("/{seq_id}", status_code=204)
def delete_sequence(seq_id: int, db: Session = Depends(get_db)):
    s = db.get(models.Sequence, seq_id)
    if not s:
        raise HTTPException(404, f"Sequence {seq_id} not found")
    db.delete(s)
    db.commit()
