# FTPR Copy

**Autodesk Flow Production Tracking** (구 *ShotGrid*, 최초 *Shotgun*) 의 핵심 기능을
재현한 **VFX 프로덕션 관리 프로토타입**.

> 목적: "원본과 기능적으로 어느 정도까지 같게 만들 수 있는가"를 검증하는 프로토타입.
> 상세 기획·조사·설계 근거는 [`기획/`](기획/) 폴더 참조.

---

## 폴더 구조 (대분류)

```
FTPR_copy/
├── 기획/            📄 기획·조사·설계 문서 (읽을거리)
├── 개발/            💻 실행 가능한 코드
│   ├── backend/     🐍 Python (FastAPI) — REST API.  venv 로컬 격리
│   ├── frontend/    🟦 TypeScript (React+Vite) — 웹 UI.  node_modules 로컬
│   └── database/    🗄️ SQLite 파일 DB (ftpr.db)
├── start.sh         ▶️ 백엔드+프론트 동시 실행
└── README.md
```

언어는 폴더로 명시 분리: `backend`=Python 전용, `frontend`=TypeScript 전용.

---

## 빠른 실행

### 한 번에 (권장)
```bash
./start.sh
```
- 처음 실행 시 venv 생성 + 패키지 설치 + DB 시드 + npm install 을 자동 수행.
- 백엔드 API: http://127.0.0.1:8000 (문서 http://127.0.0.1:8000/docs)
- 프론트 UI: http://localhost:5173

### 따로 실행
```bash
# 터미널 1 — 백엔드
cd 개발/backend && ./run.sh

# 터미널 2 — 프론트
cd 개발/frontend && npm install   # 최초 1회
npm run dev
```

### 샘플 데이터 다시 채우기
```bash
cd 개발/backend && ./seed.sh
```

---

## 격리(Isolation) 원칙 — 시스템 오염 없음

| 대상 | 위치 | 설명 |
|------|------|------|
| Python 패키지 | `개발/backend/venv/` | global pip 미사용 |
| TS 패키지 | `개발/frontend/node_modules/` | `npm install -g` 미사용 |
| 데이터베이스 | `개발/database/ftpr.db` | 설치형 DB 아님, 파일 1개 |

---

## 구현된 기능 (요약)

- **엔티티**: Project / Sequence / Shot / Asset / Task / Version / Note / Playlist
- **그리드 + 인라인 상태 편집** (원본 FPTR의 시그니처 인터랙션)
- **Task 담당자 할당 / My Tasks**
- **Version 미디어 리뷰 + Note 스레드**
- **Playlist (데일리)**
- **대시보드 통계** (상태 분포)

전체 범위·제외 항목·원본 대비 비교는 [`기획/04_기능범위_로드맵.md`](기획/04_기능범위_로드맵.md),
[`기획/07_구현결과_원본비교.md`](기획/07_구현결과_원본비교.md) 참조.

## 기술 스택
- 백엔드: Python 3.9 · FastAPI · SQLAlchemy 2 · Pydantic 2 · SQLite
- 프론트: TypeScript · React 18 · Vite · React Router · TanStack Query

선정 이유: [`기획/03_기술스택선정이유.md`](기획/03_기술스택선정이유.md)
