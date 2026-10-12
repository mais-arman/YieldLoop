#!/bin/sh
set -eu
test "${DJANGO_ENV:-development}" != production
test -z "${REPLIT_DEPLOYMENT:-}"
export DJANGO_SETTINGS_MODULE=config.demo_settings
exec sh "$(dirname "$0")/run.sh"
