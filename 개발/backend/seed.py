"""샘플 데이터 시드 스크립트.

실행: ./venv/bin/python seed.py
기존 DB를 비우고(drop_all) 원본 FPTR 스타일의 샘플 프로덕션을 생성한다.
- 여러 프로젝트, 부서별 사용자, 시퀀스/샷, 에셋, 가변 파이프라인 태스크(staggered),
  버전, 노트, 플레이리스트, 활동 이력(EventLog).
"""
from datetime import date, datetime, timedelta

from app.database import Base, SessionLocal, engine
from app import models


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


STATUSES = [
    ("wtg", "Waiting to Start", "#b9b9b9", 1),
    ("rdy", "Ready to Start", "#59b0e6", 2),
    ("ip", "In Progress", "#f0a818", 3),
    ("rev", "Pending Review", "#c0a3d9", 4),
    ("apr", "Approved", "#7bbd5c", 5),
    ("fin", "Final", "#3a8a3a", 6),
    ("hld", "On Hold", "#e06666", 7),
    ("omt", "Omit", "#777777", 8),
]

STEPS = [
    ("MOD", "Modeling", "#6fa8dc", "Asset"),
    ("RIG", "Rigging", "#8e7cc3", "Asset"),
    ("SURF", "Surfacing", "#c27ba0", "Asset"),
    ("MM", "Matchmove", "#76a5af", "Shot"),
    ("LAY", "Layout", "#6d9eeb", "Shot"),
    ("ANM", "Animation", "#f6b26b", "Shot"),
    ("FX", "FX", "#e06666", "Shot"),
    ("LGT", "Lighting", "#ffd966", "Shot"),
    ("CMP", "Compositing", "#93c47d", "Shot"),
    ("ROTO", "Roto/Paint", "#c27ba0", "Shot"),
]

USERS = [
    ("Park Jisoo", "jisoo", "jisoo@studio.com", "Modeling", "artist", "#6fa8dc"),
    ("Kim Minho", "minho", "minho@studio.com", "Animation", "artist", "#f6b26b"),
    ("Lee Soyeon", "soyeon", "soyeon@studio.com", "Lighting", "artist", "#ffd966"),
    ("Choi Hyun", "hyun", "hyun@studio.com", "FX", "artist", "#e06666"),
    ("Jung Dahye", "dahye", "dahye@studio.com", "Compositing", "artist", "#93c47d"),
    ("Yoon Supervisor", "yoon", "yoon@studio.com", "Production", "supervisor", "#674ea7"),
    ("Han Coord", "han", "han@studio.com", "Production", "coordinator", "#45818e"),
]

ASSET_TYPES_STEPS = ["MOD", "RIG", "SURF"]
SHOT_PIPELINES = [
    ["LAY", "ANM", "FX", "LGT", "CMP"],
    ["LAY", "ANM", "LGT", "CMP"],
    ["MM", "LAY", "ANM", "FX", "LGT", "CMP"],
    ["LAY", "ANM"],
    ["ROTO", "LAY", "ANM", "FX", "LGT", "CMP"],
    ["LAY", "ANM", "FX", "CMP"],
    ["LAY", "ANM", "FX", "LGT", "CMP"],
    ["MM", "LAY", "ANM"],
    ["LAY", "ANM", "FX", "LGT", "CMP", "ROTO"],
]
SHOT_STEP_ARTIST = {"MM": "minho", "LAY": "minho", "ANM": "minho", "FX": "hyun", "LGT": "soyeon", "CMP": "dahye", "ROTO": "hyun"}
THUMBS = [f"/static/thumbs/img_{i}.jpg" for i in range(1, 13)]

# ---- 프로젝트 정의 ----
PROJECTS = [
    {
        "name": "Project Nebula", "code": "NEB", "status": "active",
        "desc": "SF 액션 장편 — FTPR 프로토타입 데모 프로젝트",
        "start": date(2026, 1, 5), "end": date(2026, 12, 20),
        "assets": [
            ("Hero_Robot", "Character", "ip"), ("Villain_Drone", "Character", "rev"),
            ("Spaceship_Falcon", "Vehicle", "ip"), ("City_Downtown", "Environment", "wtg"),
            ("Laser_Gun", "Prop", "apr"), ("Explosion_FX", "FX", "wtg"),
        ],
        "sequences": [
            ("SEQ010", "Opening — 도시 추격", [("SEQ010_0010", "ip", 1001, 1085), ("SEQ010_0020", "rev", 1086, 1140), ("SEQ010_0030", "wtg", 1141, 1220), ("SEQ010_0040", "ip", 1221, 1290)]),
            ("SEQ020", "Mid — 우주선 도킹", [("SEQ020_0010", "apr", 2001, 2070), ("SEQ020_0020", "ip", 2071, 2160), ("SEQ020_0030", "hld", 2161, 2210)]),
            ("SEQ030", "Climax — 최종 결전", [("SEQ030_0010", "wtg", 3001, 3120), ("SEQ030_0020", "wtg", 3121, 3200)]),
        ],
    },
    {
        "name": "Aurora Tales", "code": "AUR", "status": "active",
        "desc": "스톱모션 풍 판타지 애니메이션",
        "start": date(2026, 3, 1), "end": date(2027, 2, 28),
        "assets": [
            ("Fox_Hero", "Character", "apr"), ("Owl_Sage", "Character", "ip"),
            ("Enchanted_Forest", "Environment", "ip"), ("Magic_Staff", "Prop", "fin"),
            ("River_Spirit", "FX", "rev"),
        ],
        "sequences": [
            ("SEQ100", "Prologue — 숲의 아침", [("SEQ100_0010", "apr", 1001, 1060), ("SEQ100_0020", "fin", 1061, 1120), ("SEQ100_0030", "rev", 1121, 1180)]),
            ("SEQ200", "Journey — 강을 건너", [("SEQ200_0010", "ip", 2001, 2090), ("SEQ200_0020", "ip", 2091, 2150), ("SEQ200_0030", "rdy", 2151, 2200), ("SEQ200_0040", "wtg", 2201, 2260)]),
        ],
    },
    {
        "name": "Steel Horizon", "code": "STL", "status": "bidding",
        "desc": "메카 시리즈 — 에피소드 1 (입찰 단계)",
        "start": date(2026, 6, 1), "end": date(2026, 10, 31),
        "assets": [
            ("Mech_Titan", "Character", "ip"), ("Drone_Scout", "Vehicle", "rdy"),
            ("Hangar_Bay", "Environment", "wtg"), ("Plasma_Rifle", "Prop", "wtg"),
        ],
        "sequences": [
            ("EP01_010", "Cold Open — 격납고", [("EP01_010_0010", "ip", 1001, 1075), ("EP01_010_0020", "rdy", 1076, 1150)]),
            ("EP01_020", "Act 1 — 출격", [("EP01_020_0010", "wtg", 2001, 2080), ("EP01_020_0020", "wtg", 2081, 2160), ("EP01_020_0030", "wtg", 2161, 2240)]),
        ],
    },
]


def build_project(db, steps, users, spec, gthumb):
    project = models.Project(
        name=spec["name"], code=spec["code"], status=spec["status"],
        description=spec["desc"], start_date=spec["start"], end_date=spec["end"],
    )
    db.add(project)
    db.flush()

    assets = {}
    for i, (code, atype, status) in enumerate(spec["assets"]):
        a = models.Asset(
            project_id=project.id, code=code, asset_type=atype, status=status,
            thumbnail=THUMBS[gthumb[0] % len(THUMBS)], description=f"{atype} asset — {code.replace('_', ' ')}",
        )
        gthumb[0] += 1
        db.add(a)
        db.flush()
        assets[code] = a
        for j, scode in enumerate(ASSET_TYPES_STEPS):
            a_start = spec["start"] + timedelta(days=j * 18 + i * 6)
            t = models.Task(
                project_id=project.id, content=steps[scode].name, step_id=steps[scode].id,
                status=status if j == 0 else "wtg", entity_type="Asset", entity_id=a.id,
                start_date=a_start, due_date=a_start + timedelta(days=22),
            )
            t.assignees = [users["jisoo"]]
            db.add(t)

    asset_list = list(assets.values())
    gshot = 0
    shots = []
    for sidx, (scode, sdesc, shot_defs) in enumerate(spec["sequences"]):
        seq = models.Sequence(project_id=project.id, code=scode, description=sdesc)
        db.add(seq)
        db.flush()
        for shidx, (shot_code, status, cin, cout) in enumerate(shot_defs):
            shot = models.Shot(
                project_id=project.id, sequence_id=seq.id, code=shot_code, status=status,
                cut_in=cin, cut_out=cout, cut_duration=cout - cin + 1,
                thumbnail=THUMBS[gthumb[0] % len(THUMBS)], description=f"{sdesc} — shot {shidx + 1}",
            )
            gthumb[0] += 1
            db.add(shot)
            db.flush()
            shots.append(shot)
            if asset_list:
                shot.assets = [asset_list[0], asset_list[min(1, len(asset_list) - 1)]]
            this_steps = SHOT_PIPELINES[gshot % len(SHOT_PIPELINES)]
            shot_base = spec["start"] + timedelta(days=60 + gshot * 9)
            gshot += 1
            for j, stp in enumerate(this_steps):
                tstatus = "apr" if stp == "LAY" else status if stp == "ANM" else ("wtg" if status in ("wtg", "rdy") else "rdy")
                t_start = shot_base + timedelta(days=j * 16)
                t = models.Task(
                    project_id=project.id, content=steps[stp].name, step_id=steps[stp].id,
                    status=tstatus, entity_type="Shot", entity_id=shot.id,
                    start_date=t_start, due_date=t_start + timedelta(days=20),
                )
                t.assignees = [users[SHOT_STEP_ARTIST[stp]]]
                db.add(t)
    db.flush()

    # 버전 (ANM 태스크 산출물)
    versions = []
    anm_tasks = (
        db.query(models.Task).filter_by(entity_type="Shot", project_id=project.id)
        .join(models.Step, models.Task.step_id == models.Step.id)
        .filter(models.Step.code == "ANM").all()
    )
    for t in anm_tasks[:6]:
        shot = db.get(models.Shot, t.entity_id)
        for vn in (1, 2):
            v = models.Version(
                project_id=project.id, code=f"{shot.code}_anim_v{vn:03d}",
                description=f"Animation pass {vn}", status="apr" if vn == 1 else "rev",
                task_id=t.id, entity_type="Shot", entity_id=shot.id, user_id=users["minho"].id,
                thumbnail=shot.thumbnail,
                media_url=f"/static/media/v{(len(versions) % 5) + 1}.mp4",  # 실제 샘플 영상
                frame_count=(shot.cut_duration or 80), version_number=vn,
            )
            db.add(v)
            db.flush()
            versions.append(v)

    # 노트
    if versions:
        n1 = models.Note(
            project_id=project.id, subject="Review feedback",
            body="캐릭터 동작 타이밍 검토 요망. 무게감 보강 부탁.",
            user_id=users["yoon"].id, link_entity_type="Version", link_entity_id=versions[-1].id,
        )
        db.add(n1)
        db.flush()
        db.add(models.Note(
            project_id=project.id, body="수정 후 다음 버전 올리겠습니다.", user_id=users["minho"].id,
            link_entity_type="Version", link_entity_id=versions[-1].id, parent_id=n1.id,
        ))

    # 플레이리스트
    pl = models.Playlist(project_id=project.id, code=f"{spec['code']} Dailies", description="리뷰 데일리")
    pl.versions = versions[:4]
    db.add(pl)

    # 활동 이력 시드 (최근 며칠)
    base = datetime(2026, 6, 25, 9, 0, 0)
    actors = [users["minho"], users["soyeon"], users["yoon"], users["hyun"]]
    for k, shot in enumerate(shots[:5]):
        db.add(models.EventLog(
            project_id=project.id, entity_type="Shot", entity_id=shot.id,
            event_type="status_change", attribute="status",
            old_value="Waiting to Start", new_value=shot.status,
            message="changed Status: Waiting to Start → In Progress",
            user_id=actors[k % len(actors)].id, created_at=base + timedelta(hours=k * 5),
        ))
    for k, v in enumerate(versions[:4]):
        db.add(models.EventLog(
            project_id=project.id, entity_type="Shot", entity_id=v.entity_id,
            event_type="version", message=f"submitted Version {v.code}",
            user_id=users["minho"].id, created_at=base + timedelta(hours=k * 7 + 2),
        ))

    return project, shots, versions


def main():
    reset_db()
    db = SessionLocal()
    try:
        for code, name, color, order in STATUSES:
            db.add(models.Status(code=code, name=name, color=color, sort_order=order))
        steps = {}
        for code, name, color, et in STEPS:
            s = models.Step(code=code, name=name, color=color, entity_type=et)
            db.add(s); db.flush(); steps[code] = s
        users = {}
        for name, login, email, dept, role, color in USERS:
            u = models.HumanUser(name=name, login=login, email=email, department=dept, role=role, color=color)
            db.add(u); db.flush(); users[login] = u

        gthumb = [0]
        for spec in PROJECTS:
            build_project(db, steps, users, spec, gthumb)

        db.commit()

        print("=== Seed 완료 ===")
        print(f"Projects : {db.query(models.Project).count()}")
        print(f"Users    : {db.query(models.HumanUser).count()}")
        print(f"Assets   : {db.query(models.Asset).count()}")
        print(f"Sequences: {db.query(models.Sequence).count()}")
        print(f"Shots    : {db.query(models.Shot).count()}")
        print(f"Tasks    : {db.query(models.Task).count()}")
        print(f"Versions : {db.query(models.Version).count()}")
        print(f"Notes    : {db.query(models.Note).count()}")
        print(f"Playlists: {db.query(models.Playlist).count()}")
        print(f"Events   : {db.query(models.EventLog).count()}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
