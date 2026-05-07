#!/bin/sh

echo "Waiting for postgres..."

while ! nc -z postgres 5432; do
  sleep 1
done

echo "Postgres started"

echo "Running migrations..."

npx prisma migrate deploy

echo "Running seed..."

node dist/prisma/seed.js || true

echo "Starting backend..."

node dist/src/main.js