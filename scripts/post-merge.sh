#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Phase 1 explicitly prohibits migrations and schema pushes.
uv sync --frozen
