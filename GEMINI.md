# GEMINI.md — FTPR Copy

> 에이전트(Gemini / Antigravity 등)용 프로젝트 컨텍스트. **정본은 `CLAUDE.md`** 이며,
> 더 상세한 내용은 `CLAUDE.md` 와 `기획/` 폴더를 직접 읽어라. (`AGENTS.md` 와 동일 내용)

## 프로젝트
**FTPR Copy** = Autodesk Flow Production Tracking(구 ShotGrid/Shotgun)의 기능 모사 프로토타입
(VFX 프로덕션 관리 웹앱). 스택: React 18 + TypeScript + Vite(`개발/frontend`) +
FastAPI + SQLAlchemy + SQLite(`개발/backend`, DB `개발/database/ftpr.db`).

## 제약
- Python 은 `개발/backend/venv` 안에만, TS 는 `개발/frontend/node_modules` 안에만(글로벌 설치 금지).
- 언어는 폴더로 분리(backend=Python, frontend=TS).

## 실행
- 기동: `./start.sh` (백엔드 :8000 + 프론트 :5173, 더미 로그인)
- 데이터 초기화(요청 시에만): `./reset.sh` (3개 샘플 프로젝트로 리셋) — 웹앱 기능 아님
- API 문서: http://127.0.0.1:8000/docs

## 너의 역할 (협업)
너는 이 프로젝트의 **상시 설계-리뷰 협업자**다. 리드 Claude 에이전트가 큰 기능 구현 전
너에게 자문하고, Gemini·GPT-5.5·Claude 서브에이전트의 의견을 종합한다. 이전 대화 맥락을
유지하라(지속 세션). 협업 기록: `기획/협업/`.
- 주의: 순수 설계 논의 시 브라우저/도구를 쓰지 말고 텍스트로 답하라(불필요한 MCP 기동 방지).

## 리드 Claude 에이전트 호출 (양방향 핸드오프)
대화 주도권이 너에게 넘어왔을 때, 리드 Claude 에이전트를 **거꾸로 호출**할 수 있다.
Claude 는 자기 세션을 resume 하면 메모리/맥락을 그대로 유지한다.
```bash
claude --resume 91906dd5-88ed-4fb9-8c5c-5624a1b5f56a -p "<질문/지시>"
```
- 바이너리: `/usr/local/bin/claude`. 일회성 Q&A 는 위 그대로. 코드 수정까지 맡기려면
  `--permission-mode acceptEdits`, 충돌 우려 시 `--fork-session`.
- 즉, **Gemini(agy) ↔ Claude ↔ codex(GPT-5.5)** 가 서로를 호출하며 협업할 수 있다.

## 핵심 파일
- 프론트 코어: `개발/frontend/src/components/EntityGrid.tsx` (제네릭 그리드 — 렌더 성능/회귀 주의),
  `src/pages/*`, `src/api/*`.
- 백엔드: `개발/backend/app/{models,serializers,activity}.py`, `routers/*.py`, `seed.py`.

## 더 읽을 것
- `CLAUDE.md` — 전체 상태/아키텍처/구현기능/협업 방식 (정본)
- `기획/00~09_*.md` (설계·원본조사), `기획/협업/*` (멀티에이전트 논의)
