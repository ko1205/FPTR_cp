# CLAUDE.md — FTPR Copy 프로젝트 (세션 인계 문서)

이 문서는 **다른 세션에서도 작업을 이어갈 수 있도록** 프로젝트 상태·실행법·규칙·
협업 방식을 정리한다. (세션 시작 시 자동 로드됨)

---

## 1. 프로젝트란

**Autodesk Flow Production Tracking(FPTR, 구 ShotGrid/Shotgun)** 의 기능을 모사하는
**VFX 프로덕션 관리 웹앱 프로토타입**. "원본과 어디까지 기능적으로 같게 만들 수 있나" 검증용.

- 백엔드: **Python FastAPI + SQLAlchemy + SQLite(파일DB)** — `개발/backend/`
- 프론트: **React 18 + TypeScript + Vite + TanStack Query** — `개발/frontend/`
- DB 파일: `개발/database/ftpr.db` (설치형 DB 미사용)
- 기획/조사/협업 문서: `기획/`

### 제약(반드시 준수)
- Python 패키지는 `개발/backend/venv` 안에만 (global pip 금지).
- TS 패키지는 `개발/frontend/node_modules` 안에만 (`npm -g` 금지).
- 언어 영역은 폴더로 분리(backend=Python, frontend=TS).

---

## 2. 실행

```bash
./start.sh        # 백엔드(:8000) + 프론트(:5173) 동시 기동 (최초 시 venv/npm 자동 설치)
./reset.sh        # SQLite 데이터를 깨끗한 샘플(3 프로젝트)로 초기화 — 수동 실행용
```
- 백엔드만: `cd 개발/backend && ./run.sh` · 시드: `./seed.sh`
- 프론트만: `cd 개발/frontend && npm run dev`
- UI: http://localhost:5173 (더미 로그인 → 아무 이메일 Sign In) · API 문서: http://127.0.0.1:8000/docs
- **데이터 초기화는 사용자가 "초기화/리셋" 지시 시 `./reset.sh` 실행** (웹앱 기능 아님).

### 스크린샷으로 UI 확인(헤드리스)
- 인증 필요 화면은 localStorage `fptr.auth` 설정 필요. 임시 프로파일 + CDP(node, 내장 WebSocket)로
  `localStorage.setItem('fptr.auth', ...)` 후 캡처. 패턴은 과거 `/tmp/cdp*.mjs` 참고.
- 원본 실제 FPTR 접속·코드 추출 방법: `기획/협업/FPTR_접속_및_코드읽기_방법.md`.

---

## 3. 현재 구현된 기능 (요약)

**데이터/엔티티**: Project, Sequence, Shot, Asset, Task, Version, Note, Playlist, HumanUser,
Status, Step, CustomFieldDef, EventLog(Activity). 3개 샘플 프로젝트(NEB/AUR/STL).

**그리드(EntityGrid, 제네릭)**: 2단 상단 네비(글로벌 바 + 프로젝트 엔티티 탭) · 스프레드시트 그리드 ·
인라인 상태셀 편집 · **컬럼 드래그 재배치 / 리사이즈 / 표시·숨김(Fields) / 헤더클릭 정렬 / 컬럼별 Filter 패널** ·
**커스텀필드(DB)** · **체크박스 일괄선택 + 일괄 Status/삭제** · **파이프라인 스텝 정렬 스트립** ·
List/Thumbnail 모드 · 더블클릭 텍스트(Description=textarea) 편집 · **우클릭 컨텍스트 삭제** ·
**Add 폼 / Add Multiple / Add CSV** · 고정폭+가로스크롤(창 확장 시 썸네일 고정).

**화면**: Project List(로고 클릭) · Overview(통계) · Shots/Assets 그리드 · My Tasks · Schedule/Gantt ·
Review/Versions 그리드+리뷰 패널 · Playlists · **엔티티 상세 전체페이지**(브레드크럼+큰썸네일+필드표+
Activity/Tasks/Versions/Notes 서브탭).

**기타**: 더미 로그인/유저메뉴/로그아웃 · Projects 드롭다운 선택 · 활동이력(EventLog) 기록·표시 ·
실제 base.css 추출 색/폰트 토큰(#0696d7 등) · 샘플 썸네일 이미지(`/static/thumbs`).

남은 로드맵: 전역 Inbox/Activity 피드, 백엔드 bulk create/delete 엔드포인트, 커스텀필드 타입 확장
(date/entity/user), 기본 컬럼 확장(Reel/Priority/Camera), CSV 인용 파서, 폼 focus-trap.

---

## 4. 협업 방식 (멀티 에이전트) — 중요

큰 설계는 **외부 모델 + Claude 서브에이전트**와 논의 후 구현하고 `기획/협업/`에 기록한다.

- **agy** (Antigravity CLI) → **Gemini**. 호출: `agy --model "Gemini 3.5 Flash (High)" -p "..." < /dev/null`
  - 주의: 복잡한 질문에 브라우저 MCP를 띄우며 멈추므로 "Do NOT use tools, answer in text" 명시.
  - **지속 세션(검증됨)**: 명시 conversation id 로 이어감 —
    `agy --conversation 4dad3d08-4a7d-4e7e-b817-b4598cfcae5a --model "Gemini 3.5 Flash (High)" -p "..." < /dev/null`
    (`-c`/`--continue`= 최근 대화도 가능하나 drift 위험 → 명시 id 권장.)
- **codex** → **GPT-5.5**. 호출: `codex exec -m gpt-5.5 -s read-only --skip-git-repo-check "..." < /dev/null`
  - 주의: stdin을 `< /dev/null`로 막고 `--skip-git-repo-check` 필요(이 폴더는 git repo 아님).
  - **지속 세션(검증됨)**: 플래그를 `resume` **앞**에 두고 session id 로 이어감 —
    `codex exec -m gpt-5.5 -s read-only --skip-git-repo-check resume 019f07a5-ed38-7543-8062-c054ad0adc4c "..." < /dev/null`
    (세션은 `~/.codex/sessions` 에 저장되어 다른 Claude 세션에서도 유효)
- **Claude 서브에이전트**: Agent 도구(general-purpose)로 내 코드를 직접 읽혀 구현 플랜을 받음.

**양방향 핸드오프**: 주도권이 codex/agy 로 넘어가면, 그들이 리드 Claude 를 거꾸로 호출 가능 —
`claude --resume 91906dd5-88ed-4fb9-8c5c-5624a1b5f56a -p "..."` (resume 시 메모리 유지). 이 호출법은
저장소 `AGENTS.md`/`GEMINI.md` 에 명시되어 codex/agy 가 읽는다. (codex ↔ Claude ↔ Gemini 상호 호출)

세션 핸들/호출법은 Claude 메모리(`memory/`)의 `collab-agent-sessions` 에도 기록됨.
협업 로그: `기획/협업/00_협업개요.md` ~ `07_*.md` + `원본응답/`.

---

## 5. 핵심 파일
- 프론트 그리드: `개발/frontend/src/components/EntityGrid.tsx`(제네릭 코어), `gridView.ts`(뷰설정),
  `PipelineStrip.tsx`. 페이지: `src/pages/*`. API: `src/api/{types,hooks,client}.ts`.
- 백엔드: `개발/backend/app/{models,serializers,activity}.py`, `routers/*.py`, `seed.py`.
- 기획: `기획/00~09_*.md`(설계·원본조사), `기획/협업/*`(멀티에이전트 논의), `기획/이미지/원본참고/`(실제 FPTR 캡처 + 내 클론 캡처).
