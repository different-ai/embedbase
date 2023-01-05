FROM python:3.10-slim
# TODO: alpine / scratch

ENV PYTHONUNBUFFERED True

ENV APP_HOME /app
WORKDIR $APP_HOME
COPY . ./

ENV PORT 8080

RUN pip install --no-cache-dir -r requirements.txt
# As an example here we're running the web service with one worker on uvicorn.
# CMD exec gunicorn -w 1 -k uvicorn.workers.UvicornH11Worker api:app -b 0.0.0.0:${PORT} --threads 4
CMD exec uvicorn search.api:app --host 0.0.0.0 --port ${PORT} --workers 1