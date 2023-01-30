#!/bin/bash

cd /app
export $(cat .env | xargs) && /opt/bitnami/node/bin/pm2 start index.js -f --name app