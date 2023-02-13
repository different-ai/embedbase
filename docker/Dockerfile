FROM python:3.10-slim
# TODO: alpine / scratch

ENV PYTHONUNBUFFERED True

ENV APP_HOME /app
WORKDIR $APP_HOME
COPY . ./

ENV PORT 8080
ARG FLAVOR=all
RUN pip install --no-cache-dir .[$FLAVOR]

ENTRYPOINT ["docker/docker-entrypoint.sh"]
CMD ["embedbase"]
