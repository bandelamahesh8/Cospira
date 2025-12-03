#!/bin/bash

# Deployment Script

echo "Deploying ShareUs Cloud Rooms..."

# 1. Pull latest changes
git pull origin main

# 2. Build and start containers
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Prune unused images
docker image prune -f

echo "Deployment complete!"
