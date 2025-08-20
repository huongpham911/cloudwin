#!/bin/bash

# Kill processes using common ports for WinCloud Builder

echo "🔍 Checking and killing processes on common ports..."

# Ports to check
PORTS=(5000 5173 7000 7001 5432 5433 6379 6380 8080 8081)

for port in "${PORTS[@]}"; do
    echo "Checking port $port..."
    
    # Find process using the port
    PID=$(sudo lsof -t -i:$port 2>/dev/null)
    
    if [ ! -z "$PID" ]; then
        echo "  🔴 Port $port is used by PID: $PID"
        echo "  🔫 Killing process..."
        sudo kill -9 $PID 2>/dev/null || true
        echo "  ✅ Process killed"
    else
        echo "  ✅ Port $port is free"
    fi
done

echo
echo "🛑 Stopping system services that might conflict..."
sudo systemctl stop postgresql 2>/dev/null || true
sudo systemctl stop redis-server 2>/dev/null || true
sudo systemctl stop redis 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

echo
echo "🐳 Stopping all Docker containers..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

echo
echo "🧹 Cleaning up Docker resources..."
docker network prune -f 2>/dev/null || true
docker volume prune -f 2>/dev/null || true

echo
echo "✅ All ports should be free now!"
echo "🚀 You can now run: SKIP_VENV=true ./deploy.sh development"
