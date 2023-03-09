LATEST_IMAGE_URL="ghcr.io/another-ai/embedbase:latest"
# read version from setup.py
VERSION="$(shell python3 setup.py --version)"
IMAGE_URL="ghcr.io/another-ai/embedbase:${VERSION}"
LOCAL_PORT="8000"

install: ## [DEVELOPMENT] Install the API dependencies
	virtualenv env; \
	. env/bin/activate; \
	pip install .[all]; \
	pip install -r requirements-test.txt
	@echo "Done, run '\033[0;31msource env/bin/activate\033[0m' to activate the virtual environment"

run: ## [DEVELOPMENT] Run the API
	uvicorn embedbase.api:app --port ${LOCAL_PORT} --reload --log-level debug 

test: ## [Local development] Run tests with pytest.
	cd embedbase; \
	python3 -m pytest -s test_db.py::test_search; \
	python3 -m pytest -s test_db.py::test_fetch; \
	python3 -m pytest -s test_db.py::test_fetch_by_hash; \
	python3 -m pytest -s test_db.py::test_clear; \
	python3 -m pytest -s test_db.py::test_upload; \
	python3 -m pytest -s test_end_to_end.py::test_clear; \
	python3 -m pytest -s test_end_to_end.py::test_semantic_search; \
	python3 -m pytest -s test_end_to_end.py::test_refresh_small_documents; \
	python3 -m pytest -s test_end_to_end.py::test_sync_no_id_collision; \
	python3 -m pytest -s test_end_to_end.py::test_embed; \
	python3 -m pytest -s test_end_to_end.py::test_embed_large_text; \
	python3 -m pytest -s test_end_to_end.py::test_ignore_document_that_didnt_change; \
	python3 -m pytest -s test_end_to_end.py::test_save_clear_data; \
	python3 -m pytest -s test_end_to_end.py::test_health_properly_forward_headers; \
	python3 -m pytest -s test_end_to_end.py::test_insert_large_documents; \
	python3 -m pytest -s test_auth.py::test_enable_firebase_auth
# TODO in api.py
# python3 -m pytest -s test_end_to_end.py::test_adding_twice_the_same_data_is_ignored
	@echo "Done testing"

docker/build/prod: ## [Local development] Build the docker image.
	@echo "Building docker image for urls ${LATEST_IMAGE_URL} and ${IMAGE_URL}"
	docker buildx build . --platform linux/amd64 -t ${LATEST_IMAGE_URL} -f ./docker/Dockerfile
	docker buildx build . --platform linux/amd64 -t ${IMAGE_URL} -f ./docker/Dockerfile

docker/run/dev: ## [Local development] Run the development docker image.
	docker-compose up --build

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
	git commit -m "${VERSION}: $$COMMIT"; \
	git push origin main; \
	git tag ${VERSION}; \
	git push origin ${VERSION}
	@echo "Done, check https://github.com/another-ai/embedbase/actions"

.PHONY: help

help: # Run `make help` to get help on the make commands
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
