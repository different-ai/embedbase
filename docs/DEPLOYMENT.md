## Cloud Run deployment

[Don’t want to handle infra? We’re launching a hosted version soon. Just click here to be first to know when it comes out](https://yep.so/p/embedase?ref=github).

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
gcloud secrets create EMBEDBASE --replication-policy=automatic

# add a secret version based on your yaml config
gcloud secrets versions add EMBEDBASE --data-file=config.yaml

IMAGE_URL="gcr.io/${PROJECT_ID}/embedbase:0.0.1"

docker buildx build . --platform linux/amd64 -t ${IMAGE_URL} -f ./docker/Dockerfile

docker push ${IMAGE_URL}

gcloud run deploy embedbase \
  --image ${IMAGE_URL} \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets /secrets/config.yaml=EMBEDBASE:1

# getting cloud run url
gcloud run services list --platform managed --region us-central1 --format="value(status.url)" --filter="metadata.name=embedbase"
```
