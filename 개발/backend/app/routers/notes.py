"""Note CRUD (다형 링크 + 스레드)."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import activity, models, schemas, serializers
from ..database import get_db

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("")
def list_notes(
    project_id: Optional[int] = None,
    link_entity_type: Optional[str] = None,
    link_entity_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Note)
    if project_id is not None:
        q = q.filter(models.Note.project_id == project_id)
    if link_entity_type:
        q = q.filter(models.Note.link_entity_type == link_entity_type)
    if link_entity_id is not None:
        q = q.filter(models.Note.link_entity_id == link_entity_id)
    rows = q.order_by(models.Note.created_at.asc()).all()
    return [serializers.note_dict(n, db) for n in rows]


@router.post("", status_code=201)
def create_note(payload: schemas.NoteCreate, db: Session = Depends(get_db)):
    n = models.Note(**payload.model_dump())
    db.add(n)
    db.flush()
    if n.link_entity_type and n.link_entity_id:
        activity.record_event(
            db, project_id=n.project_id, entity_type=n.link_entity_type, entity_id=n.link_entity_id,
            event_type="note", message="added a note", user_id=n.user_id,
        )
    db.commit()
    db.refresh(n)
    return serializers.note_dict(n, db)


@router.patch("/{note_id}")
def update_note(note_id: int, payload: schemas.NoteUpdate, db: Session = Depends(get_db)):
    n = db.get(models.Note, note_id)
    if not n:
        raise HTTPException(404, f"Note {note_id} not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(n, k, v)
    db.commit()
    db.refresh(n)
    return serializers.note_dict(n, db)


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    n = db.get(models.Note, note_id)
    if not n:
        raise HTTPException(404, f"Note {note_id} not found")
    db.delete(n)
    db.commit()
