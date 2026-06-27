# 05. REST API 설계

백엔드(FastAPI)와 프론트엔드(React)의 **계약(contract)**.
원본 `shotgun_api3`의 엔티티 CRUD 패턴을 REST로 옮긴 형태.

- Base URL: `http://localhost:8000/api`
- 응답: JSON. 날짜는 ISO 8601.
- 자동 문서: `http://localhost:8000/docs` (Swagger UI)

---

## 1. 공통 패턴

원본 shotgun_api3는 `find / find_one / create / update / delete`의 엔티티 범용
패턴을 쓴다. 본 API는 이를 **엔티티별 RESTful 엔드포인트**로 표현한다.

```
GET    /api/{entities}            목록 (find)   — 필터/정렬 쿼리 지원
GET    /api/{entities}/{id}       단건 (find_one)
POST   /api/{entities}            생성 (create)
PATCH  /api/{entities}/{id}       부분 수정 (update)  ← 인라인 편집의 핵심
DELETE /api/{entities}/{id}       삭제 (delete)
```

### 공통 쿼리 파라미터 (목록)
- `project_id` — 프로젝트 스코프 필터
- `status` — 상태 코드 필터 (콤마 다중)
- `sort` — 정렬 필드 (`-` 접두 = 내림차순), 예 `sort=-created_at`
- `limit`, `offset` — 페이징

---

## 2. 엔드포인트 목록

### 마스터
- `GET /api/statuses` — 상태 목록 (code,name,color)
- `GET /api/steps` — 파이프라인 스텝 목록
- `GET /api/users` — 사용자 목록

### Project
- `GET /api/projects`
- `GET /api/projects/{id}`
- `POST /api/projects`
- `PATCH /api/projects/{id}`
- `DELETE /api/projects/{id}`
- `GET /api/projects/{id}/stats` — 대시보드용 진척 통계

### Sequence
- `GET /api/sequences?project_id=`
- 표준 CRUD

### Shot
- `GET /api/shots?project_id=&sequence_id=&status=&sort=`
- 표준 CRUD
- `GET /api/shots/{id}/tasks`
- `GET /api/shots/{id}/versions`

### Asset
- `GET /api/assets?project_id=&asset_type=&status=`
- 표준 CRUD
- `GET /api/assets/{id}/tasks`

### Task
- `GET /api/tasks?project_id=&entity_type=&entity_id=&assignee_id=&status=`
- 표준 CRUD
- `PATCH /api/tasks/{id}` — status, assignees 변경 (인라인 편집)
- `GET /api/tasks/my?user_id=` — My Tasks

### Version
- `GET /api/versions?project_id=&entity_type=&entity_id=&task_id=`
- 표준 CRUD

### Note
- `GET /api/notes?link_entity_type=&link_entity_id=`
- `POST /api/notes`
- `PATCH/DELETE`

### Playlist
- `GET /api/playlists?project_id=`
- 표준 CRUD
- `POST /api/playlists/{id}/versions` — 버전 추가 {version_id}
- `DELETE /api/playlists/{id}/versions/{version_id}`

---

## 3. 응답 예시

### GET /api/shots?project_id=1
```json
[
  {
    "id": 12,
    "code": "SEQ010_0010",
    "project_id": 1,
    "sequence_id": 3,
    "sequence_code": "SEQ010",
    "status": "ip",
    "status_name": "In Progress",
    "status_color": "#f0a818",
    "cut_in": 1001,
    "cut_out": 1085,
    "cut_duration": 85,
    "thumbnail": "#3a6ea5",
    "task_count": 5,
    "created_at": "2026-06-20T09:00:00"
  }
]
```

### PATCH /api/tasks/45  (인라인 상태 변경)
요청:
```json
{ "status": "rev" }
```
응답: 갱신된 Task 객체.

### PATCH /api/tasks/45  (담당자 변경)
```json
{ "assignee_ids": [3, 7] }
```

---

## 4. 에러 형식
```json
{ "detail": "Shot 999 not found" }
```
- 404 미존재, 422 검증 실패(Pydantic), 400 잘못된 요청.

---

## 5. 원본 API와의 매핑 (동등성 근거)

| shotgun_api3 | 본 프로토타입 |
|--------------|---------------|
| `sg.find("Shot", filters, fields)` | `GET /api/shots?project_id=&status=` |
| `sg.find_one("Shot", ...)` | `GET /api/shots/{id}` |
| `sg.create("Shot", data)` | `POST /api/shots` |
| `sg.update("Shot", id, data)` | `PATCH /api/shots/{id}` |
| `sg.delete("Shot", id)` | `DELETE /api/shots/{id}` |
| `sg.upload_thumbnail(...)` | `thumbnail` 필드(색상 placeholder) |

→ 호출 형태는 다르지만 **엔티티 CRUD라는 의미적 동등성**을 유지한다.
