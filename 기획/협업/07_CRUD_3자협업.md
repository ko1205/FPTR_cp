# 협업 세션 07 — CRUD (우클릭삭제/일괄삭제/Add폼/Add Multiple·CSV)

- 일자: 2026-06-27
- **3자 협업**: 메인=Claude + **Claude 서브에이전트**(내 코드 직접 읽음) + Gemini(agy) + GPT-5.5(codex)
- 원본: [`원본응답/2026-06-27_Gemini_CRUD.md`](원본응답/2026-06-27_Gemini_CRUD.md),
  [`원본응답/2026-06-27_GPT5.5_CRUD.md`](원본응답/2026-06-27_GPT5.5_CRUD.md) (+ Claude 서브에이전트 설계 doc)

## 3자 합의 / 이견

| 항목 | 합의 | 이견/판정 |
|------|------|-----------|
| 우클릭 메뉴 | `<tr onContextMenu>` + preventDefault, fixed 위치(clientX/Y), 외부클릭/Esc/스크롤(capture) 닫기, **뷰포트 클램프**, **Portal 렌더**(overflow 클리핑 회피) | 셋 다 동일 |
| 삭제 확인 | **모달**(window.confirm 대신) — Gemini/GPT-5.5 강조 | 채택 |
| 일괄 삭제 | 선택 Set 사용, allSettled 부분실패 | **방식 이견**: Gemini=백엔드 bulk 필수, GPT-5.5/Claude=loop 허용 → **순차 await(SQLite 락 회피)** 채택 |
| Add 폼 | 페이지가 `addFields[{key,label,type,options,required,default}]` + `onCreate` 주입, EntityGrid는 제네릭 **모달** | 셋 다 동일 (inline-row 아님) |
| 폼 함정 | 폼 상태 open마다 리셋, `_id`/number 강제 캐스팅, 빈 옵션필드 payload 제외 | 채택 |
| Add Multiple/CSV | 텍스트영역, lines→primaryField / CSV 헤더 매핑, allSettled | CSV는 단순 split(인용 콤마 미지원 명시) — Gemini는 PapaParse+매핑 UI 제안(프로토타입엔 과함) |

> Claude 서브에이전트는 내 코드를 직접 읽어 **정확한 prop/state 추가 위치**와
> `useCreateEntity/useDeleteEntity` 기존재를 짚어줌(가장 실행가능한 설계).

## 메인 에이전트 처리(완료·검증)
- EntityGrid 신규 prop: `addFields?`, `primaryField`, `onCreate?`, `onDelete?` (+ `AddField` 타입).
- 우클릭 컨텍스트 메뉴(Portal, 클램프, Esc/스크롤 닫기) → Open/Delete + 확인 모달.
- More 드롭다운: **Delete selected (N)**(순차 삭제) · Add Multiple… · Add CSV….
- Add 폼 모달(addFields 기반, 필수검증, number/_id 캐스팅, 빈필드 제외).
- BatchAddModal(lines/csv, allSettled 부분실패 리포트).
- Shots/Assets: `useCreateEntity/useDeleteEntity`(+Shots `useSequences`) + addFields/onCreate/onDelete 주입.
- **검증**: 빌드 0 에러. POST→삭제 API end-to-end(204/404). UI 캡처: Add폼·More·우클릭메뉴.

## 다음(권고)
- 백엔드 `POST /{entity}/bulk_delete`·`/bulk_create` 로 대량 시 최적화, CSV 인용 파서, 폼 focus-trap.
