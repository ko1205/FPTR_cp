#!/usr/bin/env bash
# DB를 초기화하고 샘플 데이터를 다시 채운다.
set -e
cd "$(dirname "$0")"
./venv/bin/python seed.py
