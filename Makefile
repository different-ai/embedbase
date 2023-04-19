LATEST_IMAGE_URL="ghcr.io/different-ai/embedbase:latest"
# read version from pyproject.toml
VERSION="$(shell python -c 'import toml; print(toml.load("pyproject.toml")["tool"]["poetry"]["version"])')"
IMAGE_URL="ghcr.io/different-ai/embedbase:${VERSION}"
LOCAL_PORT="8000"

install: ## [DEVELOPMENT] Install the API dependencies
	virtualenv env; \
	. env/bin/activate; \
	pip install .[all]; \
	pip install -r requirements-test.txt
	@echo "Done, run '\033[0;31msource env/bin/activate\033[0m' to activate the virtual environment"

run: ## [DEVELOPMENT] Run the API
	uvicorn embedbase.__main__:app --port ${LOCAL_PORT} --reload --log-level debug 

test: ## [Local development] Run tests with pytest.
	docker run -d --name pgvector -p 8080:8080 -p 5432:5432 \
    	-e POSTGRES_DB=embedbase -e POSTGRES_PASSWORD=localdb
	while ! docker exec -it pgvector pg_isready -U postgres; do sleep 1; done
	poetry run pytest
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
	git tag core-${VERSION}; \
	git push origin core-${VERSION}
	@echo "Done, check '\033[0;31mhttps://github.com/different-ai/embedbase/actions\033[0m'"

openapi:
	curl localhost:8000/openapi.json | yq -y > .well-known/openapi.yaml

.PHONY: help

help: # Run `make help` to get help on the make commands
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
