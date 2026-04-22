#!/bin/bash


# Frontend
echo "🌐 Frontend: http://localhost:3000"
kubectl port-forward service/frontend 3000:3000 > /dev/null 2>&1 &

# Backend
echo "⚙️  Backend:  http://localhost:8000"
kubectl port-forward service/backend 8000:8000 > /dev/null 2>&1 &
echo "🚀 Starting Frontend Tunnel..."
# Open frontend in the current terminal (backgrounded)
minikube service frontend &

echo "⚙️  Starting Backend Tunnel in a new window..."
# This opens a fresh Terminal window and runs the backend service command
osascript -e 'tell app "Terminal" to do script "minikube service backend"'

echo "✅ Both services are being exposed."