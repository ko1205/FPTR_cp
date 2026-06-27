# 협업 세션 10 — 백엔드 Bulk Create/Delete 엔드포인트

- 일자: 2026-06-27
- **자문**: GPT-5.5(`codex … resume 019f07a5…`). (Gemini 호출은 사용자가 중단 → GPT-5.5 + 메인 판단으로 진행)
- 원본: [`원본응답/2026-06-27_GPT5.5_bulk엔드포인트.md`](원본응답/2026-06-27_GPT5.5_bulk엔드포인트.md)

## 배경
프론트가 "Add Multiple / Add CSV"는 `onCreate` N회, 일괄 삭제는 `onDelete` N회로 처리 → 네트워크 왕복 다수,
부분 실패로 활동 이력 들쭉날쭉. 단일 호출 bulk 엔드포인트로 정리.

## GPT-5.5 자문 결론(채택)
1. **REST shape**: 명시적 sub-route — `POST /api/{entity}/batch`(생성), `POST /api/{entity}/batch-delete`(삭제).
   `DELETE` + JSON body 는 클라/프록시/OpenAPI 호환성 떨어져 회피.
2. **트랜잭션**: 프로토타입은 **all-or-nothing 단일 커밋**(검증→전부 생성/삭제→EventLog→commit). 에러 처리·프론트 단순.
3. **활동 로깅**: **엔티티당 EventLog 1건**(entity-centric). 대량시 요약 이벤트 추가 가능하나 per-entity 대체 금지.
4. **응답 shape**: 생성 `{created:[...full serialized...], count}`, 삭제 `{deleted_ids:[...], count}`.
   실패는 422(행/인덱스 에러). 프론트는 성공 후 목록/활동/스탯 쿼리 **1회 무효화**.

## 구현(완료)
- **백엔드**:
  - `schemas.IdList{ ids:List[int] }`.
  - `routers/shots.py`: `POST /api/shots/batch`(List[ShotCreate]) · `POST /api/shots/batch-delete`(IdList).
    생성은 항목별 `created` 이벤트, 삭제는 항목별 `deleted` 이벤트, 단일 commit. 응답 위 shape.
  - `routers/assets.py`: 동일 패턴(`/api/assets/batch`, `/batch-delete`).
  - (참고) 단건 create/delete 는 기존대로 이벤트 미기록 — bulk 만 entity-centric 이벤트 추가.
- **프론트**:
  - `useBulkCreate(entity)` → `POST /{entity}/batch`(items), `useBulkDelete(entity)` → `POST /{entity}/batch-delete`({ids}).
    성공 시 `invalidateBulk()` 로 shots/assets/versions/projectStats/activityProj/activityGlobal **1회 무효화**.
  - `EntityGrid` 에 옵션 prop `onBulkCreate`/`onBulkDelete` 추가. 있으면 단일 호출, **없으면 기존 N회 루프로 폴백**
    (Versions 그리드 등 bulk 미지원 엔티티는 자동 폴백). BatchAddModal·일괄삭제 핸들러가 분기.
  - `Shots.tsx`/`Assets.tsx` 가 `useBulkCreate/useBulkDelete` 연결(생성 시 `project_id` 주입).

## 검증
- 백엔드 직접 + **vite 프록시(:5173) 왕복**: batch create(count N, 전체 직렬화 객체 반환) → batch-delete(deleted_ids/count) →
  잔여 0, 테스트 EventLog 정리 완료(개발 DB 오염 없음).
- 프론트 빌드 0 에러.

## 다음
- 단건 create/delete 에도 created/deleted 이벤트 통일(선택), 부분 실패 보고형(best-effort) 은 CSV import 고도화 시.
