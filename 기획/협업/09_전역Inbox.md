# 협업 세션 09 — 전역 Inbox / Activity 피드

- 일자: 2026-06-27
- **지속 세션 협업**: GPT-5.5(`codex … resume 019f07a5…`) + Gemini(`agy --conversation 4dad3d08…`)
- 원본: [`원본응답/2026-06-27_GPT5.5_전역Inbox.md`](원본응답/2026-06-27_GPT5.5_전역Inbox.md),
  [`원본응답/2026-06-27_Gemini_전역Inbox.md`](원본응답/2026-06-27_Gemini_전역Inbox.md)

## 두 모델 합의
1. **내용**: 전 프로젝트 활동 집계(Notes/@mention/Version 제출/Task 배정/상태변경). 프로토타입은
   기존 EventLog 행 + Note/Task/Version 이벤트 특별 처리로 시작.
2. **그룹/정렬**: 역시간순 + **날짜 버킷(Today/Yesterday/This Week/Earlier)**. Inbox 는 unread 강조,
   Activity 는 순수 시간순. 스레드 묶기는 v1 생략(이벤트 1건=1행).
3. **행 레이아웃**: 액터 아바타 · 동사구 · 타겟 엔티티 링크(Shot SH010 등) · 프로젝트 라벨 ·
   스니펫 · 상대시간(+정확시각 tooltip) · unread 점 · 클릭 시 상세로 이동.
4. **읽음(unread)**: **반드시 유저별**. 전역 `EventLog.read` 금지.
   - GPT-5.5: `Notification(user_id, event_log_id, read_at, reason)` 테이블 — 가장 충실.
   - Gemini: 프로토타입엔 **last-read 타임스탬프**(User 1컬럼) 또는 **client localStorage read-set** 이 가장 가벼움.

## 메인 에이전트 결정 & 처리(완료)
- **읽음 추적**: Gemini 의 경량안 채택 — **localStorage `fptr.inbox.lastReadMs`**(백엔드 스키마 변경 0,
  더미 auth 의 `fptr.auth` localStorage 패턴과 일치). 값은 "읽음 처리 시점의 최신 이벤트 시각(ms)"으로
  저장해 **이벤트 시각끼리 비교** → naive-UTC ↔ local 파싱 편차 무영향.
  (운영 전환 시 GPT-5.5 의 Notification 테이블로 승격 가능 — 후속 로드맵.)
- **백엔드**: `GET /api/activity/global?limit=` 추가(`routers/activity.py`). EventLog 전 프로젝트 역시간순 +
  `_enrich()` 로 **project{code,name}** 와 **entity_label**(Shot=code, Task=content, Note=subject…) 배치 부착.
- **프론트**:
  - `useGlobalActivity()` 훅, `InboxEvent` 타입(project + entity_label).
  - `pages/Inbox.tsx` — 날짜 버킷, 상대시간, 액터·동사·엔티티링크·프로젝트칩·이벤트아이콘·unread 점,
    All/Unread 필터, **Mark all as read**. Shot/Asset 행 클릭 → 상세 이동(+프로젝트 컨텍스트 전환).
  - `util/inboxRead.ts` — lastReadMs get/markRead + `useLastReadMs()`(window `inbox-read`/`storage` 이벤트 구독).
  - GlobalBar `Inbox` 링크에 **unread 배지**(전역 피드 ↔ lastReadMs 비교, 마킹 시 즉시 갱신).
  - `/inbox` 라우트 추가 + 전역 뷰이므로 2단 프로젝트 탭 숨김(`/projects` 와 동일).
- **검증**: 빌드 0 에러. `/api/activity/global` 200(enrich 확인). 헤드리스 캡처
  [`이미지/원본참고/내클론_인박스.png`] — TODAY/YESTERDAY 버킷, 크로스프로젝트(STL/AUR/NEB),
  엔티티 링크, 배지 28, Unread 필터 정상.

## 비고 / 다음
- 스레드 묶기(노트/리플 collapse), @mention 파싱, Notification 테이블(유저별 read_at/reason) 은 후속.
- (해결) **Version 활동 행 클릭** → `/review?v=<id>` 딥링크로 Media 리뷰 패널 자동 오픈
  (`Review.tsx` 가 `?v=` 파라미터 읽어 해당 버전 select). Shot/Asset 행은 `/detail/{type}/{id}`.
  → 이전엔 Shot/Asset 만 클릭 가능해 Version 만 있는 날짜의 항목이 "클릭 안 됨"으로 보이던 문제 제거.
