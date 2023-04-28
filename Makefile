#* development variables
LOCAL_PORT="8000"

#* read version from pyproject.toml
VERSION="$(shell python -c 'import toml; print(toml.load("pyproject.toml")["tool"]["poetry"]["version"])')"

#* Docker variables
LATEST_IMAGE_URL="ghcr.io/different-ai/embedbase:latest"
IMAGE_URL="ghcr.io/different-ai/embedbase:${VERSION}"

run: ## [DEVELOPMENT] Run the API
	uvicorn embedbase.__main__:app --port ${LOCAL_PORT} --reload --log-level debug 

test: ## [Local development] Run all Python tests with pytest.
	docker run --name pgvector -e POSTGRES_DB=embedbase -e POSTGRES_PASSWORD=localdb -p 5432:5432 -p 8080:8080 -d ankane/pgvector
	while ! docker exec -it pgvector pg_isready -U postgres; do sleep 1; done
	poetry run pytest --ignore=sdk/embedbase-js
	docker stop pgvector
	@echo "Done testing"

docker/build/prod: ## [Local development] Build the docker image.
	@echo "Building docker image for urls ${LATEST_IMAGE_URL} and ${IMAGE_URL}"
	docker buildx build . --platform linux/amd64 -t ${LATEST_IMAGE_URL} -f ./docker/Dockerfile
	docker buildx build . --platform linux/amd64 -t ${IMAGE_URL} -f ./docker/Dockerfile

docker/run/dev: ## [Local development] Run the development docker image.
	docker-compose --profile dev up --build

docker/run/prod:
# note we don't use buildx here to use local platform cpu
	docker build . -t embedbase -f ./docker/Dockerfile
	docker run -p 8000:8080 \
		-v ${PWD}:/app embedbase

docker/push: docker/build/prod ## [Local development] Push the docker image to registry.
	docker push ${IMAGE_URL}
	docker push ${LATEST_IMAGE_URL}

release: ## [Local development] Release a new version of the API.
	@echo "Releasing version ${VERSION}"; \
	read -p "Commit content:" COMMIT; \
	git add .; \
	echo "Committing '${VERSION}: $$COMMIT'"; \
	git commit -m "Release ${VERSION}: $$COMMIT"; \
	git push origin main; \
	@echo "Done, check '\033[0;31mhttps://github.com/different-ai/embedbase/actions\033[0m'"

openapi:
	curl localhost:8000/openapi.json | yq -y > .well-known/openapi.yaml

#* Poetry
.PHONY: poetry-download
poetry-download:
	curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/install-poetry.py | python3 -

.PHONY: poetry-remove
poetry-remove:
	curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/install-poetry.py | python3 - --uninstall

#* Installation
.PHONY: install
install:
	poetry lock -n && poetry export --without-hashes > requirements.txt
	poetry install -n
	-poetry run mypy --install-types --non-interactive ./

#* Formatters
.PHONY: codestyle
codestyle:
	poetry run pyupgrade --exit-zero-even-if-changed --py38-plus **/*.py
	poetry run isort --settings-path pyproject.toml ./
	poetry run black --config pyproject.toml ./

.PHONY: formatting
formatting: codestyle

.PHONY: check-codestyle
check-codestyle:
	poetry run isort --diff --check-only --settings-path pyproject.toml ./
	poetry run black --diff --check --config pyproject.toml ./
	poetry run darglint --verbosity 2 embedbase tests

.PHONY: mypy
mypy:
	poetry run mypy --config-file pyproject.toml ./

.PHONY: lint
lint: test check-codestyle mypy check-safety

.PHONY: help

help: # Run `make help` to get help on the make commands
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
