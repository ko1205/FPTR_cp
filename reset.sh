#!/usr/bin/env bash
# ============================================================
# 데이터 초기화 스크립트 (수동 실행용 — 웹앱 기능 아님)
# 추가/삭제로 바뀐 SQLite 데이터를 깨끗한 샘플 상태로 되돌린다.
#   - 모든 테이블 drop + 재생성 후, 3개 샘플 프로젝트 데이터를 다시 채움
#   - 실행 중인 백엔드(uvicorn)는 재시작 불필요 (다음 요청부터 새 데이터 읽음)
# 사용: ./reset.sh
# ============================================================
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/개발/backend"

if [ ! -x venv/bin/python ]; then
  echo "[reset] venv 없음 — 먼저 ./start.sh 로 환경을 구성하세요." >&2
  exit 1
fi

echo "[reset] SQLite 데이터를 샘플 상태로 초기화합니다…"
./venv/bin/python seed.py
echo "[reset] 완료. (백엔드가 떠 있으면 새로고침 시 반영됩니다)"
