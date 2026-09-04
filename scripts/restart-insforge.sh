#!/bin/bash
set -e

JWT_SECRET='roIQK6URnIZDQx10Vs4qYCxnlip6yMg82VKIeKrDKxfDy6q4v+6tqkk2TAORf8uD/cqrhePRvJR1FHcI/17m3g'

docker rm -f insforge-smve1j4ktegaiferkfvsapop-203648150867 2>/dev/null || true

docker run -d \
  --name insforge-smve1j4ktegaiferkfvsapop-203648150867 \
  --network smve1j4ktegaiferkfvsapop \
  -e DATABASE_URL=postgresql://rD6YZHXV0wB52Zq4MQ:Jnugi8fKsy8iux3k8W@10.0.3.2:5432/insforge \
  -e POSTGRES_HOST=10.0.3.2 \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=insforge \
  -e POSTGRES_USER=rD6YZHXV0wB52Zq4MQ \
  -e POSTGRES_PASSWORD=Jnugi8fKsy8iux3k8W \
  -e POSTGREST_BASE_URL=http://postgrest:3000 \
  -e ACCESS_API_KEY=ik_Q63xh3z9gF75+/wtNqKgqgxjtqiBZBch+3pMYTUfyek/T9cNMIDSxkMPfSUpD1JiwTwSP6C2tisKsAqmiYojNA \
  -e ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTc0Mzk5NDg5MiwiZXhwIjoxOTU5OTU0ODkyfQ.0ITqOqAH0PqXR6mPsHqtqyq5YTq3q7Z5DYpKq74qCA \
  -e JWT_SECRET="$JWT_SECRET" \
  -e ENCRYPTION_KEY="$JWT_SECRET" \
  -e ADMIN_EMAIL=chamosbarbergm@gmail.com \
  -e ADMIN_PASSWORD=test123 \
  -e API_BASE_URL=https://insforge.chamosbarber.com \
  smve1j4ktegaiferkfvsapop_insforge:a7f6cfeefe5ef8317a5703b1937216afeebaec4c

echo "Container started"

docker network connect coolify insforge-smve1j4ktegaiferkfvsapop-203648150867 2>/dev/null || true
echo "Network connected"