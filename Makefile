GCLOUD_PROJECT:=$(shell gcloud config list --format 'value(core.project)' 2>/dev/null || echo "none")
REGION="us-central1"
SERVICE="search"
LATEST_IMAGE_URL=$(shell echo "gcr.io/${GCLOUD_PROJECT}/${SERVICE}:latest")
VERSION=$(shell sed -n 's/.*image:.*:\(.*\)/\1/p' service.prod.yaml)
IMAGE_URL=$(shell echo "gcr.io/${GCLOUD_PROJECT}/${SERVICE}:${VERSION}")
LOCAL_PORT="8080"
$(info GCLOUD_PROJECT is set to $(GCLOUD_PROJECT), to change it run `gcloud config set project <project>`)
$(info To get a list of your projects run `gcloud projects list`)

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
	python3 -m pytest -s test_main.py::test_refresh_small_documents; \
	python3 -m pytest -s test_main.py::test_embed; \
	python3 -m pytest -s test_main.py::test_upload; \
	python3 -m pytest -s test_main.py::test_embed_large_text; \
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

docker/deploy: docker/push ## [Local development] Deploy the Cloud run service.
	@echo "Will deploy ${SERVICE} to ${REGION} on ${GCLOUD_PROJECT}"
	gcloud beta run services replace ./service.prod.yaml --region ${REGION}

docker/deploy/dev: ## [Local development] Deploy the Cloud run service.
	docker buildx build . --platform linux/amd64 -t ${LATEST_IMAGE_URL}-dev -f ./search/Dockerfile
	docker push ${LATEST_IMAGE_URL}-dev
	gcloud beta run services replace ./service.dev.yaml --region ${REGION}

release: ## [Local development] Release a new version of the API.
	@VERSION=$$(sed -n 's/.*image:.*:\(.*\)/\1/p' service.prod.yaml); \
	echo "Releasing version $$VERSION"; \
	read -p "Commit content:" COMMIT; \
	git add .; \
	echo "Committing '$$VERSION: $$COMMIT'"; \
	git commit -m "$$VERSION: $$COMMIT"; \
	git push origin main; \
	git tag $$VERSION; \
	git push origin $$VERSION
	@echo "Done, check https://github.com/another-ai/search/actions"

policy: ## [Local development] Set the IAM policy for the service.
	gcloud run services set-iam-policy ${SERVICE} ./policy.prod.yaml --region ${REGION}

.PHONY: help

help: # Run `make help` to get help on the make commands
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
