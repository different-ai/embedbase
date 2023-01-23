FROM python:3.10-slim
# TODO: alpine / scratch

ENV PYTHONUNBUFFERED True

ENV APP_HOME /app
WORKDIR $APP_HOME
COPY . ./

ENV PORT 8080

RUN pip install --no-cache-dir -r requirements.txt
CMD exec gunicorn -w 1 -k uvicorn.workers.UvicornWorker search.api:app -b 0.0.0.0:${PORT} --threads 8 --timeout 0 --log-level info
