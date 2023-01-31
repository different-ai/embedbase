## Cloud Run deployment

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

# create a secret for the config
gcloud secrets create SEARCH --replication-policy=automatic

# add a secret version based on your yaml config
gcloud secrets versions add SEARCH --data-file=config.yaml
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
KEY_PATH="${PROJECT_ID}.cloud-run-deployer.svc.prod.json"
gcloud iam service-accounts keys create ${KEY_PATH} \
  --iam-account=cloud-run-deployer@.iam.gserviceaccount.com
cat ${KEY_PATH}
# copy the key to GitHub secrets as `GCP_SA_KEY_PROD`
rm -rf ${KEY_PATH}
```
