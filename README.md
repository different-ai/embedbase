# API

API dedicated to simplify the usage of search with Obsidian AI.

This is runnable locally or in Google Cloud Run.

Please refer to [the main Makefile](./Makefile) for the available commands.


## Releasing

1. bump `service.prod.yaml` Docker image tag  
  ⚠️ Ensure there is no "dev" in the tag, i.e. `gcr.io/obsidian-ai/obsidian-search:0.0.7` ⚠️
2. Push your code to `main`

## Cloud Run configuration

### Setup

```bash
# login to gcloud
gcloud auth login

PROJECT_ID=$(gcloud config get-value project)

# Enable container registry
gcloud services enable containerregistry.googleapis.com

# Enable Cloud Run
gcloud services enable run.googleapis.com

# Enable Secret Manager
gcloud services enable secretmanager.googleapis.com

# create a secret for the stability key
gcloud secrets create OBSIDIAN_SEARCH --replication-policy=automatic

# add a version to the secret (from https://pinecone.io)

# create a ".env" file with content:
# PINECONE_API_KEY="foo"
gcloud secrets versions add OBSIDIAN_SEARCH --data-file=.env
```

### Manual deployment

```bash
make docker/deploy
```

### Automatic deployment through GitHub Actions

```bash
# create service account for pushing containers to gcr
# and deploying to cloud run
gcloud iam service-accounts create cloud-run-deployer \
  --display-name "Cloud Run deployer"

# Grant the appropriate Cloud Run role
# to the service account to provide repository access
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member serviceAccount:cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/run.admin

# Grant the appropriate Cloud Storage role
# to the service account to provide registry access
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member serviceAccount:cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/storage.admin

# Service Account User
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member serviceAccount:cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/iam.serviceAccountUser

# get svc key
KEY_PATH="obsidian-ai.cloud-run-deployer.svc.prod.json"
gcloud iam service-accounts keys create ${KEY_PATH} \
  --iam-account=cloud-run-deployer@${PROJECT_ID}.iam.gserviceaccount.com
cat ${KEY_PATH}
# copy the key to GitHub secrets as `GCP_SA_KEY_PROD`
rm -rf ${KEY_PATH}
```
