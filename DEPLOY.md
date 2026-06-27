# 무료 배포 가이드 (Render 단일 서비스)

> ✅ **라이브: https://ftpr-copy.onrender.com/** (Render 무료 web service, 작동 확인 2026-06-27)

이 프로젝트는 **하나의 무료 웹 서비스**로 배포된다. FastAPI 가
`/api`(REST) + `/static`(썸네일·mp4) + 빌드된 Vite SPA(`/`) 를 **같은 오리진**에서 서빙하므로
CORS·별도 프론트 호스트가 필요 없다. 협업 논의: [`기획/협업/11_무료호스팅배포.md`](기획/협업/11_무료호스팅배포.md).

## 준비된 것 (코드)
- `Dockerfile` — 멀티스테이지: ① node 로 `npm run build`(dist) → ② python 으로 FastAPI 실행, dist 를 이미지에 포함.
- `render.yaml` — Render Blueprint(무료 web service, Docker, healthcheck `/api/health`).
- `.dockerignore` — venv/node_modules/dist/db/기획 등 제외.
- 백엔드 `main.py` — 빌드된 SPA 서빙(클라이언트 라우팅 새로고침 시 `index.html` 폴백) + **부팅 시 DB 비어있으면 자동 시드**.
- `database.py` — `FTPR_DB_DIR` 환경변수로 쓰기 가능 경로 지정(휘발 FS 대응).
- 프론트는 이미 상대경로(`/api`, `/static`)라 수정 불필요.

## 데이터 정책
무료 티어는 **파일시스템이 휘발**(재배포/슬립 복귀 시 초기화)된다. 이 앱은 그걸 전제로,
부팅 때 DB 가 비어 있으면 `seed.py` 로 **샘플 3개 프로젝트를 자동 재시드**한다. 영속 저장이 필요해지면
Neon(무료 Postgres) 로 전환 가능(후속).

## 배포 절차

### 1) GitHub 에 올리기 (사용자 직접)
```bash
# 이미 로컬 git 초기화됨 (branch main). 원격만 추가:
git remote add origin https://github.com/<당신>/<repo>.git
git push -u origin main
```

### 2) Render 에서 배포
1. https://render.com 가입(신용카드 불필요) → 대시보드.
2. **New +** → **Blueprint** → 위 GitHub repo 선택 → `render.yaml` 자동 인식 → **Apply**.
   - (또는 **New + → Web Service** → repo 선택 → Runtime **Docker** → Plan **Free** → Create.)
3. 첫 빌드(프론트 빌드 + 파이썬 설치)에 수 분 소요. 완료되면 `https://ftpr-copy-xxxx.onrender.com` 발급.
4. 접속. **무료 티어는 15분 유휴 후 슬립** → 첫 요청은 30~60초(콜드스타트) 걸린 뒤 시드된 데모가 뜬다.
   더미 로그인(아무 이메일 → Sign In)으로 진입.

### 대안: Hugging Face Spaces (16GB RAM, 48h 슬립)
같은 Dockerfile 사용 가능. Docker Space 생성 → repo push → 앱이 `$PORT`(HF 는 보통 **7860**)로 리슨하도록
Space 설정(`app_port: 7860`)만 맞추면 된다.

## 로컬에서 "배포 모드" 확인 (선택)
```bash
cd 개발/frontend && npm run build          # dist 생성
cd ../backend && ./venv/bin/uvicorn app.main:app --port 8000
# http://127.0.0.1:8000  →  SPA + API 가 한 포트에서 동작
```
(`개발/frontend/dist` 가 있으면 FastAPI 가 자동으로 SPA 를 서빙한다. 없으면 순수 API 모드.)

## 주의 / 한계
- 콜드스타트(첫 요청 30~60초) 동안 로딩 지연 — 데모 특성상 수용.
- keep-alive 핑은 Render 무료 750시간을 거의 소진하므로 권장하지 않음.
- 한글 폴더 경로(`개발/`)는 Docker BuildKit(UTF-8) 에서 정상 동작. 만약 빌더가 거부하면
  Render 네이티브 빌드(빌드/스타트 커맨드 2줄)로 전환하거나 경로 ASCII 화 검토.
