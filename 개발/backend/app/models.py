"""SQLAlchemy ORM 모델.

기획/02_데이터모델설계.md 의 스키마를 그대로 구현한다.
원본 FPTR(ShotGrid) 의 표준 엔티티 명칭/필드를 최대한 존중.
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base

# ---------------------------------------------------------------------------
# 다대다 연결 테이블
# ---------------------------------------------------------------------------
shot_asset_link = Table(
    "shot_asset_link",
    Base.metadata,
    Column("shot_id", ForeignKey("shots.id", ondelete="CASCADE"), primary_key=True),
    Column("asset_id", ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True),
)

task_assignee = Table(
    "task_assignee",
    Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

playlist_version = Table(
    "playlist_version",
    Base.metadata,
    Column("playlist_id", ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True),
    Column("version_id", ForeignKey("versions.id", ondelete="CASCADE"), primary_key=True),
    Column("sort_order", Integer, default=0),
)


# ---------------------------------------------------------------------------
# 마스터 데이터
# ---------------------------------------------------------------------------
class Status(Base):
    __tablename__ = "statuses"
    code = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#b9b9b9")
    sort_order = Column(Integer, default=0)


class Step(Base):
    __tablename__ = "steps"
    id = Column(Integer, primary_key=True)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#6fa8dc")
    entity_type = Column(String, default="Shot")  # 'Shot' / 'Asset'


class HumanUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    login = Column(String, unique=True, nullable=False)
    email = Column(String)
    department = Column(String)
    role = Column(String, default="artist")  # artist/supervisor/coordinator/admin
    color = Column(String, default="#888888")


# ---------------------------------------------------------------------------
# 프로덕션 엔티티
# ---------------------------------------------------------------------------
class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    code = Column(String)
    status = Column(String, default="active")  # active/bidding/archived
    description = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    sequences = relationship("Sequence", back_populates="project", cascade="all, delete-orphan")
    shots = relationship("Shot", back_populates="project", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")


class Sequence(Base):
    __tablename__ = "sequences"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="sequences")
    shots = relationship("Shot", back_populates="sequence")


class Shot(Base):
    __tablename__ = "shots"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sequence_id = Column(ForeignKey("sequences.id", ondelete="SET NULL"))
    code = Column(String, nullable=False)
    description = Column(Text)
    status = Column(ForeignKey("statuses.code"), default="wtg")
    cut_in = Column(Integer)
    cut_out = Column(Integer)
    cut_duration = Column(Integer)
    thumbnail = Column(String)  # 색상 placeholder 또는 URL
    custom_fields = Column(JSON, default=dict)  # 커스텀필드 값 {field_id: value}
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="shots")
    sequence = relationship("Sequence", back_populates="shots")
    assets = relationship("Asset", secondary=shot_asset_link, back_populates="shots")


class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code = Column(String, nullable=False)
    asset_type = Column(String, default="Character")
    description = Column(Text)
    status = Column(ForeignKey("statuses.code"), default="wtg")
    thumbnail = Column(String)
    custom_fields = Column(JSON, default=dict)  # 커스텀필드 값 {field_id: value}
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="assets")
    shots = relationship("Shot", secondary=shot_asset_link, back_populates="assets")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    step_id = Column(ForeignKey("steps.id"))
    status = Column(ForeignKey("statuses.code"), default="wtg")
    # 다형 연결: 'Shot' / 'Asset'
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False)
    start_date = Column(Date)
    due_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    step = relationship("Step")
    assignees = relationship("HumanUser", secondary=task_assignee)


class Version(Base):
    __tablename__ = "versions"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code = Column(String, nullable=False)
    description = Column(Text)
    status = Column(ForeignKey("statuses.code"), default="rev")
    task_id = Column(ForeignKey("tasks.id", ondelete="SET NULL"))
    entity_type = Column(String)  # 'Shot' / 'Asset'
    entity_id = Column(Integer)
    user_id = Column(ForeignKey("users.id"))
    thumbnail = Column(String)
    media_url = Column(String)
    frame_count = Column(Integer)
    version_number = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("HumanUser")
    task = relationship("Task")


class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String)
    body = Column(Text, nullable=False)
    user_id = Column(ForeignKey("users.id"))
    # 다형 링크
    link_entity_type = Column(String)  # 'Version'/'Shot'/'Task'/'Asset'
    link_entity_id = Column(Integer)
    parent_id = Column(ForeignKey("notes.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("HumanUser")


class Playlist(Base):
    __tablename__ = "playlists"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    versions = relationship("Version", secondary=playlist_version, order_by=playlist_version.c.sort_order)


class EventLog(Base):
    """활동/변경 이력 (Activity / History).

    협업 결론(GPT-5.5): SQLAlchemy 리스너/미들웨어 대신 라우터에서 명시적 헬퍼로 기록.
    old/new 는 사람이 읽을 값(예: 상태명)을 문자열로 저장. 프로토타입이라 user_id 는 nullable.
    detail Activity 탭이 유용하도록, Task/Version/Note 이벤트는 연결된 부모(Shot/Asset)에 기록한다.
    """
    __tablename__ = "event_logs"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"))
    entity_type = Column(String, nullable=False)  # 이벤트가 표시될 엔티티 (Shot/Asset/...)
    entity_id = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False)  # status_change / field_change / created / note / version
    attribute = Column(String)  # 변경 속성 (status, description ...)
    old_value = Column(Text)
    new_value = Column(Text)
    message = Column(Text)  # 사람이 읽는 요약 (예: "changed Status: Waiting → In Progress")
    user_id = Column(ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("HumanUser")


class CustomFieldDef(Base):
    """커스텀필드 정의 (프로젝트 + 엔티티 타입별).

    협업 결론(Gemini/GPT-5.5 합의)에 따라 커스텀필드 스키마와 값을 DB에 둔다.
    값은 각 엔티티의 custom_fields JSON 에, 정의는 이 테이블에 저장.
    """
    __tablename__ = "custom_field_defs"
    id = Column(Integer, primary_key=True)
    project_id = Column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String, nullable=False)  # 'Shot' / 'Asset'
    field_id = Column(String, nullable=False)  # 슬러그 (예: 'priority')
    label = Column(String, nullable=False)
    type = Column(String, default="text")  # text / number / checkbox / date / user / entity
    created_at = Column(DateTime, default=datetime.utcnow)
