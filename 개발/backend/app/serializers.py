"""ORM 객체 -> enriched dict 변환.

원본 FPTR 그리드는 셀에 상태 이름/색상, 담당자, 연관 카운트를 함께 보여준다.
프론트가 추가 조회 없이 그릴 수 있도록 응답에 파생 필드를 합쳐 반환한다.
"""
from sqlalchemy.orm import Session

from . import models


def _iso(dt):
    return dt.isoformat() if dt else None


def status_map(db: Session):
    return {s.code: s for s in db.query(models.Status).all()}


def step_map(db: Session):
    return {s.id: s for s in db.query(models.Step).all()}


def _status_fields(code, smap):
    st = smap.get(code)
    return {
        "status": code,
        "status_name": st.name if st else code,
        "status_color": st.color if st else "#b9b9b9",
    }


def user_dict(u: models.HumanUser):
    if not u:
        return None
    return {
        "id": u.id,
        "name": u.name,
        "login": u.login,
        "email": u.email,
        "department": u.department,
        "role": u.role,
        "color": u.color,
    }


def status_dict(s: models.Status):
    return {"code": s.code, "name": s.name, "color": s.color, "sort_order": s.sort_order}


def step_dict(s: models.Step):
    return {"id": s.id, "code": s.code, "name": s.name, "color": s.color, "entity_type": s.entity_type}


def project_dict(p: models.Project, db: Session = None):
    return {
        "id": p.id,
        "name": p.name,
        "code": p.code,
        "status": p.status,
        "description": p.description,
        "start_date": _iso(p.start_date),
        "end_date": _iso(p.end_date),
        "created_at": _iso(p.created_at),
    }


def sequence_dict(s: models.Sequence, db: Session):
    shot_count = db.query(models.Shot).filter(models.Shot.sequence_id == s.id).count()
    return {
        "id": s.id,
        "project_id": s.project_id,
        "code": s.code,
        "description": s.description,
        "shot_count": shot_count,
        "created_at": _iso(s.created_at),
    }


def pipeline_summary(db: Session, entity_type, entity_id, smap, stepmap):
    """엔티티(Shot/Asset)의 공정별 태스크 상태 요약.

    원본 FPTR 그리드의 시그니처 요소 — 샷/에셋 행에 공정 스텝별 상태를
    색칠된 셀 줄(파이프라인 스트립)로 보여주기 위한 데이터.
    스텝(id) 순서대로 정렬해 반환한다.
    """
    tasks = (
        db.query(models.Task)
        .filter(models.Task.entity_type == entity_type, models.Task.entity_id == entity_id)
        .all()
    )
    items = []
    for t in tasks:
        step = stepmap.get(t.step_id)
        st = smap.get(t.status)
        items.append({
            "task_id": t.id,
            "step_id": t.step_id,
            "step_code": step.code if step else "?",
            "step_name": step.name if step else "?",
            "step_color": step.color if step else "#888888",
            "status": t.status,
            "status_name": st.name if st else t.status,
            "status_color": st.color if st else "#b9b9b9",
        })
    items.sort(key=lambda x: x["step_id"] or 0)
    return items


def shot_dict(s: models.Shot, db: Session, smap=None, stepmap=None):
    smap = smap or status_map(db)
    stepmap = stepmap or step_map(db)
    pipeline = pipeline_summary(db, "Shot", s.id, smap, stepmap)
    d = {
        "id": s.id,
        "type": "Shot",
        "project_id": s.project_id,
        "sequence_id": s.sequence_id,
        "sequence_code": s.sequence.code if s.sequence else None,
        "code": s.code,
        "description": s.description,
        "cut_in": s.cut_in,
        "cut_out": s.cut_out,
        "cut_duration": s.cut_duration,
        "thumbnail": s.thumbnail,
        "task_count": len(pipeline),
        "pipeline": pipeline,
        "asset_ids": [a.id for a in s.assets],
        "custom_fields": s.custom_fields or {},
        "created_at": _iso(s.created_at),
    }
    d.update(_status_fields(s.status, smap))
    return d


def asset_dict(a: models.Asset, db: Session, smap=None, stepmap=None):
    smap = smap or status_map(db)
    stepmap = stepmap or step_map(db)
    pipeline = pipeline_summary(db, "Asset", a.id, smap, stepmap)
    d = {
        "id": a.id,
        "type": "Asset",
        "project_id": a.project_id,
        "code": a.code,
        "asset_type": a.asset_type,
        "description": a.description,
        "thumbnail": a.thumbnail,
        "task_count": len(pipeline),
        "pipeline": pipeline,
        "shot_ids": [s.id for s in a.shots],
        "custom_fields": a.custom_fields or {},
        "created_at": _iso(a.created_at),
    }
    d.update(_status_fields(a.status, smap))
    return d


def _entity_name(db: Session, entity_type, entity_id):
    if entity_type == "Shot":
        e = db.get(models.Shot, entity_id)
    elif entity_type == "Asset":
        e = db.get(models.Asset, entity_id)
    else:
        return None
    return e.code if e else None


def task_dict(t: models.Task, db: Session, smap=None, stepmap=None):
    smap = smap or status_map(db)
    stepmap = stepmap or step_map(db)
    step = stepmap.get(t.step_id)
    d = {
        "id": t.id,
        "type": "Task",
        "project_id": t.project_id,
        "content": t.content,
        "step_id": t.step_id,
        "step_code": step.code if step else None,
        "step_name": step.name if step else None,
        "step_color": step.color if step else "#888888",
        "entity_type": t.entity_type,
        "entity_id": t.entity_id,
        "entity_name": _entity_name(db, t.entity_type, t.entity_id),
        "start_date": _iso(t.start_date),
        "due_date": _iso(t.due_date),
        "assignees": [user_dict(u) for u in t.assignees],
        "created_at": _iso(t.created_at),
    }
    d.update(_status_fields(t.status, smap))
    return d


def version_dict(v: models.Version, db: Session, smap=None):
    smap = smap or status_map(db)
    note_count = db.query(models.Note).filter(
        models.Note.link_entity_type == "Version", models.Note.link_entity_id == v.id
    ).count()
    d = {
        "id": v.id,
        "type": "Version",
        "project_id": v.project_id,
        "code": v.code,
        "description": v.description,
        "task_id": v.task_id,
        "entity_type": v.entity_type,
        "entity_id": v.entity_id,
        "entity_name": _entity_name(db, v.entity_type, v.entity_id),
        "user": user_dict(v.user),
        "thumbnail": v.thumbnail,
        "media_url": v.media_url,
        "frame_count": v.frame_count,
        "version_number": v.version_number,
        "note_count": note_count,
        "created_at": _iso(v.created_at),
    }
    d.update(_status_fields(v.status, smap))
    return d


def note_dict(n: models.Note, db: Session):
    return {
        "id": n.id,
        "type": "Note",
        "project_id": n.project_id,
        "subject": n.subject,
        "body": n.body,
        "user": user_dict(n.user),
        "link_entity_type": n.link_entity_type,
        "link_entity_id": n.link_entity_id,
        "parent_id": n.parent_id,
        "created_at": _iso(n.created_at),
    }


def playlist_dict(p: models.Playlist, db: Session, smap=None):
    smap = smap or status_map(db)
    return {
        "id": p.id,
        "project_id": p.project_id,
        "code": p.code,
        "description": p.description,
        "version_count": len(p.versions),
        "versions": [version_dict(v, db, smap) for v in p.versions],
        "created_at": _iso(p.created_at),
    }
