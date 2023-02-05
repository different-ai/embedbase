FROM python:3.10-slim
# TODO: alpine / scratch

ENV PYTHONUNBUFFERED True

ENV APP_HOME /app
WORKDIR $APP_HOME
COPY . ./

ENV PORT 8080

# TODO: different docker per flavor?
RUN pip install --no-cache-dir .[all]

# TODO: .sh docker entrypoint - maybe https://github.com/mautrix/telegram
