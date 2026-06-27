# 헤드리스 에이전트용 — 원본 FPTR 접속 & 코드 읽기 방법

이 문서는 헤드리스로 동작하는 분석 에이전트(Gemini/agy, GPT-5.5/codex)가
**실제 Autodesk Flow Production Tracking(FPTR) 인스턴스**를 조사하고, 현재 클론 코드와
비교할 때 따라야 할 구체적 방법을 정리한다.

---

## 0. 대상
- 실제 FPTR 사이트: `https://4th-vfx-2023-1.shotgrid.autodesk.com`
- 인증: 사용자 Chrome 프로파일 **"Profile 8"** (계정 `choigilhan@4thparty.co.kr`) 에
  로그인 세션이 있음. 헤드리스 Chrome 을 이 프로파일로 띄우면 인증된 상태로 접근됨.
- 현재 클론 코드: `개발/frontend/src` (React+TS), `개발/backend/app` (FastAPI+SQLite)
- 이미 캡처해 둔 참고자료(반드시 활용):
  - 스크린샷: `기획/이미지/원본참고/*.png` (Projects/Shots/Shot상세/Versions 등)
  - base.css 추출값: `기획/이미지/원본참고/base_css_추출.txt`
  - 실측 분석: `기획/09_원본UI_실제캡처분석.md`

---

## 1. 전제: Chrome 완전 종료
헤드리스가 그 프로파일을 쓰려면 **Chrome 앱이 완전히 종료**되어 있어야 한다(프로파일 잠금).
확인: `pgrep -f "Google Chrome.app/Contents/MacOS/Google Chrome" | wc -l` → 0 이어야 함.
(메인 에이전트가 사전에 종료시켜 둘 수 있음.)

## 2. 화면 스크린샷 (인증된 페이지)
```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
  --user-data-dir="$HOME/Library/Application Support/Google/Chrome" \
  --profile-directory="Profile 8" \
  --window-size=1680,1300 --virtual-time-budget=13000 \
  --screenshot="/tmp/out.png" "<URL>"
```

## 3. 렌더된 DOM 읽기 (구조/클래스/페이지 id 추출) — 텍스트 분석에 최적
```bash
"$CHROME" --headless=new --disable-gpu --no-first-run \
  --user-data-dir="$HOME/Library/Application Support/Google/Chrome" \
  --profile-directory="Profile 8" \
  --virtual-time-budget=12000 --dump-dom "<URL>" > /tmp/out.html
```
- 주의: **원격 디버깅(CDP)은 기본 프로파일에서 보안상 거부**된다. `--screenshot`/`--dump-dom`만 가능.

## 4. 안정적인 URL 패턴 (DOM 에서 발견됨)
- 사이트 홈(=Projects 그리드): `/`
- 프로젝트 엔티티 그리드: `/page/project_default?entity_type=<Shot|Asset|Task|Version|Note|Playlist>&project_id=<ID>`
- 엔티티 상세: `/detail/<EntityType>/<id>`  (예: `/detail/Shot/13450`)
- 프로젝트 id 찾기: 홈 DOM 덤프 후 `grep -oE 'Project/[0-9]+'` (예: 1047 = "CTR").
- 엔티티 id 찾기: 그리드 DOM 덤프 후 `grep -oE 'Shot/[0-9]+'` 등.

## 5. 실제 CSS 값 추출 (색/폰트/치수)
```bash
curl -sL "https://4th-vfx-2023-1.shotgrid.autodesk.com/dist/production/stylesheets/base.css" -o /tmp/base.css
# 예: 색 팔레트
grep -oE '#[0-9a-fA-F]{6}' /tmp/base.css | tr 'A-F' 'a-f' | sort | uniq -c | sort -rn | head -25
# 예: 컴포넌트 셀렉터
grep -oE '\.sg_cell[^{]*\{[^}]*background-color: ?#[0-9a-f]{3,6}' /tmp/base.css | head
```
- 정적 자산이라 보통 인증 불필요. (참고: 원본은 ExtJS 기반, SGDS 디자인토큰 `--sgds_basics_colors_*` 사용.)

## 6. 현재 클론 코드 읽기
- 프론트 핵심: `개발/frontend/src/components/EntityGrid.tsx`, `PipelineStrip.tsx`,
  `gridView.ts`, `src/pages/Shots.tsx`/`Assets.tsx`/`Review.tsx`, `src/styles.css`,
  `src/api/types.ts`/`hooks.ts`.
- 백엔드: `개발/backend/app/models.py`, `serializers.py`, `routers/*.py`, `seed.py`.

## 7. IP/주의
- 원본의 **독점 CSS/JS 번들을 그대로 복사 금지**. 정확한 **디자인 값/구조/동작만 추출**해
  자체 코드로 재구현하는 것이 목적.
- 사용자의 **실제 로그인 데이터**가 보일 수 있음 — 민감정보는 보고서에 옮기지 말 것.

---

## 8. 분석 산출물 형식(권장)
1. FPTR 의 해당 영역 실제 동작/구조 (근거: URL/DOM/CSS 인용).
2. 현재 클론과의 차이 표 (있음/없음/부분, 근거 파일·라인).
3. 우선순위별 구체적 개선 권고 (무엇을, 어디 파일에, 어떻게).
4. 불확실/검증 필요 항목 명시.
