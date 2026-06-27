# 협업 세션 03 — FPTR 전체 독립 조사 & 클론 비교

- 일자: 2026-06-27
- 주제: 두 에이전트가 **각자 독립적으로** 실제 FPTR을 조사하고 현재 클론과 비교
- 방식: 에이전트들에게 [`FPTR_접속_및_코드읽기_방법.md`](FPTR_접속_및_코드읽기_방법.md) 를 주고
  헤드리스 Chrome(Profile 8 인증)·dump-dom·base.css·코드 읽기를 자율 수행하게 지시
- 원본 보고서:
  - [`원본응답/2026-06-27_Gemini_FPTR전체조사.md`](원본응답/2026-06-27_Gemini_FPTR전체조사.md)
  - [`원본응답/2026-06-27_GPT5.5_FPTR전체조사.md`](원본응답/2026-06-27_GPT5.5_FPTR전체조사.md)

## 실행 메모(실측)
- **codex(GPT-5.5)**: `-s workspace-write -c sandbox_workspace_write.network_access=true`
  로 셸/네트워크 허용. 단 **인증 Chrome(dump-dom)은 샌드박스에서 빈 응답**(키체인 접근 제약) →
  공개 base.css + 캡처 참고자료로 폴백. 그럼에도 **실제 base.css 셀렉터**(`#sg_global_nav`,
  `td.sg_cell.sg_cell_status_list`, `.sgw_thumbnail_grid`, `div.launch_movie_overlay`,
  `div.sgw_calendar`, `div.sgw_entity_query_gantt`)를 추가로 추출 — 가치 큼.
- **agy(Gemini 3.1 Pro)**: `--add-dir` 로 저장소 접근, 코드+캡처 참고자료 분석.

## 두 보고서 교차검증 — 합의(✅) / 단독(•)

| 항목 | Gemini | GPT-5.5 | 검증/판정 |
|------|:------:|:-------:|-----------|
| **상세를 전체 페이지로**(현재 side panel) | ✅🔴 | ✅🔴 | **검증 완료**: `EntityDetailPanel` = `<aside>`. **최우선 조치** |
| **체크박스/행 선택 컬럼 누락** | ✅(불확실) | ✅ | 검증: 없음. 조치 대상 |
| **파이프라인을 기본 아닌 선택 필드로** | ✅🟡 | ✅🟡 | 현재 기본 컬럼(이미 Fields로 숨김 가능). 기본 노출만 조정 |
| **미사용 Sidebar.tsx 제거** | • | ✅ | 검증: App.tsx 미import. **즉시 조치** |
| Scheduling/Gantt 뷰 누락 | ✅ | ✅(CSS 근거) | 큰 미구현 표면. 로드맵 |
| Versions 전용 엔티티 그리드 | • | ✅ | Review는 카드뷰만. 로드맵 |
| Activity/History 모델 | • | ✅ | 변경이력 모델 없음. 로드맵 |
| 더 많은 기본 컬럼(Reel/Priority/Camera/Lens/Tags…) | ✅(blank 정상) | ✅ | 로드맵 |
| 커스텀필드 타입 확장(date/entity/user…) | ✅ | ✅ | 로드맵 |
| 2단 네비 / 상태 풀셀 | 이미 완료(일부 "partial"은 구버전 인식) | "present" 확인 | **이미 구현됨** |

## 메인 에이전트(Claude) 판단 & 조치

### 즉시 조치 (이번 차)
1. **상세 전체 페이지** 구현 — `/detail/:entityType/:id` 라우트 + `EntityDetail` 페이지
   (브레드크럼·큰 썸네일·필드표·연관 탭 Tasks/Versions/Notes). 행 클릭 → 페이지 이동.
   (두 모델 최우선 합의 + 사용자도 이전에 요청)
2. **미사용 Sidebar.tsx 삭제** (dead code).
3. 파이프라인은 기본 노출 유지하되(사용자가 선호) Fields로 숨김 가능함을 확인 — 별도 변경 최소.

### 로드맵(다음 차들, 합의 우선순위순)
- 체크박스 행 선택 + 일괄편집
- Versions 전용 EntityGrid + Review 오버레이
- Schedule/Gantt 뷰 (`Task.start_date/due_date` 활용)
- 기본 컬럼 확장(Reel/Priority/Camera/Lens/Tags/Note)
- Activity/History 모델, 커스텀필드 타입 확장(date/entity/user/list)
- 누락 프로젝트 탭(Notes/Project Details/Other), 관리자 배너

### 비고
- 두 모델이 **상세=전체페이지 / 체크박스컬럼 / 파이프라인-선택필드** 를 독립적으로 동일 지적 →
  신뢰도 높아 우선 반영.
- 일부 "Partial/Missing" 판정은 최신 코드(2단 네비·상태 풀셀 완료)를 덜 반영 → 직접 검증해 정정.
