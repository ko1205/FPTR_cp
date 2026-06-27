"""Pydantic 스키마 (요청 검증용).

읽기 응답은 enriched dict(상태 색상/이름, 연관 카운트 등)를 직접 구성해
반환하므로(serializers.py), 여기서는 주로 create/update 입력을 정의한다.
"""
from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ---------------- Project ----------------
class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    status: str = "active"
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


# ---------------- Sequence ----------------
class SequenceCreate(BaseModel):
    project_id: int
    code: str
    description: Optional[str] = None


class SequenceUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None


# ---------------- Shot ----------------
class ShotCreate(BaseModel):
    project_id: int
    sequence_id: Optional[int] = None
    code: str
    description: Optional[str] = None
    status: str = "wtg"
    cut_in: Optional[int] = None
    cut_out: Optional[int] = None
    thumbnail: Optional[str] = None
    asset_ids: Optional[List[int]] = None


class ShotUpdate(BaseModel):
    sequence_id: Optional[int] = None
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    cut_in: Optional[int] = None
    cut_out: Optional[int] = None
    thumbnail: Optional[str] = None
    asset_ids: Optional[List[int]] = None
    custom_fields: Optional[Dict[str, Any]] = None  # 병합 업데이트


# ---------------- Asset ----------------
class AssetCreate(BaseModel):
    project_id: int
    code: str
    asset_type: str = "Character"
    description: Optional[str] = None
    status: str = "wtg"
    thumbnail: Optional[str] = None


class AssetUpdate(BaseModel):
    code: Optional[str] = None
    asset_type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    thumbnail: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None  # 병합 업데이트


# ---------------- Task ----------------
class TaskCreate(BaseModel):
    project_id: int
    content: str
    step_id: Optional[int] = None
    status: str = "wtg"
    entity_type: str  # 'Shot' / 'Asset'
    entity_id: int
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    assignee_ids: Optional[List[int]] = None


class TaskUpdate(BaseModel):
    content: Optional[str] = None
    step_id: Optional[int] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    assignee_ids: Optional[List[int]] = None


# ---------------- Version ----------------
class VersionCreate(BaseModel):
    project_id: int
    code: str
    description: Optional[str] = None
    status: str = "rev"
    task_id: Optional[int] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    user_id: Optional[int] = None
    thumbnail: Optional[str] = None
    media_url: Optional[str] = None
    frame_count: Optional[int] = None
    version_number: int = 1


class VersionUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    thumbnail: Optional[str] = None
    media_url: Optional[str] = None


# ---------------- Note ----------------
class NoteCreate(BaseModel):
    project_id: int
    subject: Optional[str] = None
    body: str
    user_id: Optional[int] = None
    link_entity_type: Optional[str] = None
    link_entity_id: Optional[int] = None
    parent_id: Optional[int] = None


class NoteUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None


# ---------------- Playlist ----------------
class PlaylistCreate(BaseModel):
    project_id: int
    code: str
    description: Optional[str] = None


class PlaylistUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None


class PlaylistVersionAdd(BaseModel):
    version_id: int


# ---------------- CustomFieldDef ----------------
class CustomFieldDefCreate(BaseModel):
    project_id: int
    entity_type: str  # 'Shot' / 'Asset'
    label: str
    type: str = "text"  # text / number / checkbox
    field_id: Optional[str] = None  # 미지정 시 label 슬러그
