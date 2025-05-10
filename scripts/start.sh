#!/bin/bash

# OverVibeViewer (OVV) Start Script for macOS/Linux
# This script builds and starts the OVV Docker container

set -e

echo "Starting OverVibeViewer (OVV)..."
echo "=================================="

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "Visit https://docs.docker.com/get-docker/ for installation instructions."
    exit 1
fi

# Stop and remove existing container if it's running
if docker ps -a | grep -q overvibeviewer; then
    echo "Stopping and removing existing OverVibeViewer container..."
    docker stop overvibeviewer 2>/dev/null || true
    docker rm overvibeviewer 2>/dev/null || true
fi

# Build the Docker image
echo "Building the Docker image (this may take a few minutes for the first run)..."

# Try with builder=buildkit first, fall back to default if it fails
echo "Trying to build using BuildKit..."
export DOCKER_BUILDKIT=1
docker build -t overvibeviewer:latest -f "$PROJECT_DIR/docker/Dockerfile" "$PROJECT_DIR" || {
    echo "BuildKit build failed, trying legacy builder..."
    export DOCKER_BUILDKIT=0
    docker build --no-cache -t overvibeviewer:latest -f "$PROJECT_DIR/docker/Dockerfile" "$PROJECT_DIR"
}

# Define the port for the web application
PORT=3000

# Run the Docker container
echo "Starting the OverVibeViewer container..."
docker run -d \
    --name overvibeviewer \
    -p $PORT:$PORT \
    --restart unless-stopped \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$HOME:/host_home" \
    overvibeviewer:latest

# Check if container started successfully
if docker ps | grep -q overvibeviewer; then
    echo "OverVibeViewer is now running!"
    
    # Try to open browser automatically
    echo "Opening browser at http://localhost:$PORT"
    
    # Wait a moment for the server to start
    sleep 3
    
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:$PORT"
    elif command -v open &> /dev/null; then
        open "http://localhost:$PORT"
    else
        echo "Please open your browser and navigate to: http://localhost:$PORT"
    fi
    
    echo "To stop the application, run: docker stop overvibeviewer && docker rm overvibeviewer"
else
    echo "Failed to start OverVibeViewer container. Check Docker logs for details."
    docker logs overvibeviewer
    exit 1
fi