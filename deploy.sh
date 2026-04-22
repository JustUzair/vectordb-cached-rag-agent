#!/bin/bash

# --- CONFIGURATION ---
DOCKER_USER="0xjustuzair"
BACKEND_IMAGE="tessera-backend"
FRONTEND_IMAGE="tessera-frontend"
TAG="latest"

# Exit immediately if a command fails
set -e

echo "🚀 Starting Deployment for Tessera Stack..."

# 1. CLEANUP: Clear existing "broken" pods and deployments
echo "🧹 Clearing old deployments..."
kubectl delete deployments --all --ignore-not-found
# Give K8s a second to breathe
sleep 2

# 2. ENVIRONMENT: Create Secrets and ConfigMaps
# We delete them first to ensure we aren't using old values
echo "🔑 Updating Kubernetes Secrets and Configs..."

# Backend Env
kubectl delete secret backend-secrets --ignore-not-found
kubectl create secret generic backend-secrets --from-env-file=./backend/.env

kubectl delete configmap backend-config --ignore-not-found
kubectl create configmap backend-config --from-literal=NODE_ENV=production

# Frontend Env
kubectl delete secret frontend-secrets --ignore-not-found
kubectl create secret generic frontend-secrets --from-env-file=./client/.env

kubectl delete configmap frontend-config --ignore-not-found
kubectl create configmap frontend-config --from-literal=NODE_ENV=production

# 3. BUILD: Build the images
echo "📦 Building Docker images..."
docker build -t $DOCKER_USER/$BACKEND_IMAGE:$TAG ./backend
docker build -t $DOCKER_USER/$FRONTEND_IMAGE:$TAG ./client

# 4. PUSH: Push to Docker Hub
echo "📤 Pushing images to Docker Hub..."
docker push $DOCKER_USER/$BACKEND_IMAGE:$TAG
docker push $DOCKER_USER/$FRONTEND_IMAGE:$TAG

# 5. DEPLOY: Apply Kubernetes Manifests
echo "☸️  Applying Kubernetes manifests..."
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

echo "✅ Deployment complete!"
echo "📍 Watch your pods turn green: kubectl get pods -w"