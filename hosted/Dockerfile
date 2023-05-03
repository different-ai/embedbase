FROM ghcr.io/different-ai/embedbase:0.9.5-minimal
COPY requirements.txt requirements.txt
RUN apt-get update && apt-get install -y git gcc && apt-get clean && \
    pip install -r requirements.txt && rm requirements.txt
COPY ./middlewares/auth_api_key/auth_api_key.py /app/middlewares/auth_api_key/auth_api_key.py
COPY main.py main.py
COPY docker-entrypoint.sh docker/docker-entrypoint.sh

ENTRYPOINT ["docker/docker-entrypoint.sh"]
CMD ["embedbase"]