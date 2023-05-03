#!/bin/bash
set -e

if [ "$1" = 'embedbase' ]; then
    exec gunicorn -w 1 -k uvicorn.workers.UvicornWorker main:app -b 0.0.0.0:${PORT} --threads 8 --timeout 0 --log-level info
fi

exec "$@"
