"""Playlist CRUD + 버전 추가/제거 (데일리 리뷰 묶음)."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, serializers
from ..database import get_db

router = APIRouter(prefix="/api/playlists", tags=["playlists"])


@router.get("")
def list_playlists(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Playlist)
    if project_id is not None:
        q = q.filter(models.Playlist.project_id == project_id)
    rows = q.order_by(models.Playlist.created_at.desc()).all()
    smap = serializers.status_map(db)
    return [serializers.playlist_dict(p, db, smap) for p in rows]


@router.get("/{playlist_id}")
def get_playlist(playlist_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Playlist, playlist_id)
    if not p:
        raise HTTPException(404, f"Playlist {playlist_id} not found")
    return serializers.playlist_dict(p, db)


@router.post("", status_code=201)
def create_playlist(payload: schemas.PlaylistCreate, db: Session = Depends(get_db)):
    p = models.Playlist(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return serializers.playlist_dict(p, db)


@router.patch("/{playlist_id}")
def update_playlist(playlist_id: int, payload: schemas.PlaylistUpdate, db: Session = Depends(get_db)):
    p = db.get(models.Playlist, playlist_id)
    if not p:
        raise HTTPException(404, f"Playlist {playlist_id} not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return serializers.playlist_dict(p, db)


@router.delete("/{playlist_id}", status_code=204)
def delete_playlist(playlist_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Playlist, playlist_id)
    if not p:
        raise HTTPException(404, f"Playlist {playlist_id} not found")
    db.delete(p)
    db.commit()


@router.post("/{playlist_id}/versions", status_code=201)
def add_version(playlist_id: int, payload: schemas.PlaylistVersionAdd, db: Session = Depends(get_db)):
    p = db.get(models.Playlist, playlist_id)
    if not p:
        raise HTTPException(404, f"Playlist {playlist_id} not found")
    v = db.get(models.Version, payload.version_id)
    if not v:
        raise HTTPException(404, f"Version {payload.version_id} not found")
    if v not in p.versions:
        p.versions.append(v)
        db.commit()
    db.refresh(p)
    return serializers.playlist_dict(p, db)


@router.delete("/{playlist_id}/versions/{version_id}", status_code=204)
def remove_version(playlist_id: int, version_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Playlist, playlist_id)
    if not p:
        raise HTTPException(404, f"Playlist {playlist_id} not found")
    v = db.get(models.Version, version_id)
    if v and v in p.versions:
        p.versions.remove(v)
        db.commit()
