#!/usr/bin/env bash
set -o errexit

uv sync --frozen --no-dev
uv run python backend/manage.py collectstatic --no-input
uv run python backend/manage.py migrate
