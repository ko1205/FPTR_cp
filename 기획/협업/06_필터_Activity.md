# 협업 세션 06 — 컬럼별 필터 & Activity/History

- 일자: 2026-06-27
- 참여: 메인=Claude, 자문=Gemini(agy, Flash), GPT-5.5(codex, 내 코드 읽음)
- 원본: [`원본응답/2026-06-27_Gemini_필터_Activity.md`](원본응답/2026-06-27_Gemini_필터_Activity.md),
  [`원본응답/2026-06-27_GPT5.5_필터_Activity.md`](원본응답/2026-06-27_GPT5.5_필터_Activity.md)

## A. 컬럼별 필터 — 이견 → 합의
- 내 1차 시도: **필터 행**(헤더 아래 입력 행).
- **두 모델 모두 "필터 행" 비권장**: 고정폭+드래그/리사이즈 헤더와 충돌, 썸네일 모드에서 어색.
  - Gemini: 컬럼별 팝오버 + 활성 필터 칩 ribbon.
  - GPT-5.5: **Filter 툴바 패널**(컬럼 메타데이터 기반) + localStorage 저장.
- **채택**: 1차(필터 행)를 버리고 **Filter 드롭다운 패널 + 활성 필터 칩**으로 전환.
  - `GridColumn.filterAccessor?(row)=>string`, `filterType: text|select`.
  - 파이프라인: rows → search → **column filters (AND)** → group → 그룹 내부 sort.
  - 빈 그룹 제거, render 가 아니라 filterAccessor 로 필터(둘 다 강조).

## B. Activity / History — 이견 → 합의
- 모델 공통: `EventLog(project_id, entity_type, entity_id, event_type, attribute, old/new, user_id, created_at)`.
- **기록 방식 이견**: Gemini=SQLAlchemy 리스너 vs **GPT-5.5=라우터에서 명시적 헬퍼**(old/new·관계·커스텀필드 캡처가 명시적이 쉬움).
  - **채택: 명시적 헬퍼**(`activity.record_event`) — `before` 값을 setattr 전에 스냅샷.
- 기록 지점: shot/asset status·description, **task status는 연결된 부모(Shot/Asset)에**(detail Activity 가 유용하게), version 생성, note 생성.
- API: `GET /activity?project_id=`, `GET /activity/entity/{type}/{id}`.
- 프론트: detail 에 **Activity 탭(최신순, 아바타+메시지+시각)**, 기본 탭으로.
- no-auth: user_id nullable, 시드에서 행위자 부여.

## 메인 에이전트 처리(완료·검증)
- 필터: Filter 패널 + 칩, Shots/Assets/Versions 컬럼 filterAccessor 부여.
- 정렬: 헤더 클릭 asc/desc/none + 화살표, 그룹 먼저→내부 정렬, collator/안정/nulls-last.
- Activity: EventLog 모델 + `activity.py` 헬퍼 + `routers/activity.py` + 5개 라우터 instrument + Activity 탭.
- **추가 요청**: 시드를 **3개 프로젝트(NEB/AUR/STL)** 로 확장 + 활동 27건 시드.
- 캡처: `내클론_필터패널.png`, `내클론_Activity탭.png`, `내클론_3개프로젝트.png`.
- 빌드 0 에러.
