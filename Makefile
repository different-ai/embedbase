LATEST_IMAGE_URL="ghcr.io/another-ai/embedbase:latest"
VERSION="0.5.4"
IMAGE_URL="ghcr.io/another-ai/embedbase:${VERSION}"
LOCAL_PORT="8000"

-include .env

install: ## [DEVELOPMENT] Install the API dependencies
	virtualenv env; \
	source env/bin/activate; \
	pip install -r requirements.txt; \
	pip install -r requirements-test.txt
	@echo "Done, run '\033[0;31msource env/bin/activate\033[0m' to activate the virtual environment"

run: ## [DEVELOPMENT] Run the API
	uvicorn search.api:app --port ${LOCAL_PORT} --reload --log-level debug 

test: ## [Local development] Run tests with pytest.
	cd search; \
	python3 -m pytest -s test_main.py::test_semantic_search; \
	python3 -m pytest -s test_main.py::test_refresh_small_documents; \
	python3 -m pytest -s test_main.py::test_embed; \
	python3 -m pytest -s test_main.py::test_embed_large_text; \
	python3 -m pytest -s test_main.py::test_upload; \
	python3 -m pytest -s test_main.py::test_ignore_note_that_didnt_change
	@echo "Done testing"

docker/build: ## [Local development] Build the docker image.
	@echo "Building docker image for urls ${LATEST_IMAGE_URL} and ${IMAGE_URL}"
	docker buildx build . --platform linux/amd64 -t ${LATEST_IMAGE_URL} -f ./search/Dockerfile
	docker buildx build . --platform linux/amd64 -t ${IMAGE_URL} -f ./search/Dockerfile

docker/run: ## [Local development] Run the docker image.
	docker build -t ${IMAGE_URL} -f ./search/Dockerfile .
	docker run -p 8080:8080 --rm --name ${SERVICE} \
		-v "$(shell pwd)/config.yaml":/app/config.yaml \
		${IMAGE_URL}

docker/push: docker/build ## [Local development] Push the docker image to GCP.
	docker push ${IMAGE_URL}
	docker push ${LATEST_IMAGE_URL}

release: ## [Local development] Release a new version of the API.
	echo "Releasing version $$VERSION"; \
	read -p "Commit content:" COMMIT; \
	git add .; \
	echo "Committing '$$VERSION: $$COMMIT'"; \
	git commit -m "$$VERSION: $$COMMIT"; \
	git push origin main; \
	git tag $$VERSION; \
	git push origin $$VERSION
	@echo "Done, check https://github.com/another-ai/embedbase/actions"

.PHONY: help

help: # Run `make help` to get help on the make commands
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
