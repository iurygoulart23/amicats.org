#!/usr/bin/env bash
# Banco Postgres descartável para testes manuais: dados em memória (tmpfs),
# apagados ao parar. Uso:
#   npm run db:temp        # sobe, aplica migrations e seed, imprime a DATABASE_URL
#   npm run db:temp:stop   # para e apaga tudo
# Variáveis opcionais: DB_TEMP_PORTA (padrão 5434) e DB_TEMP_NOME (padrão amicats-db-temp).
set -euo pipefail

NOME=${DB_TEMP_NOME:-amicats-db-temp}
PORTA=${DB_TEMP_PORTA:-5434}
URL="postgresql://amicats:amicats@localhost:${PORTA}/amicats"

if [[ "${1:-}" == "stop" ]]; then
  docker rm -f "$NOME" >/dev/null 2>&1 && echo "Banco temporário removido." || echo "Nenhum banco temporário rodando."
  exit 0
fi

docker rm -f "$NOME" >/dev/null 2>&1 || true
docker run -d --rm --name "$NOME" -p "${PORTA}:5432" \
  -e POSTGRES_USER=amicats -e POSTGRES_PASSWORD=amicats -e POSTGRES_DB=amicats \
  --tmpfs /var/lib/postgresql/data \
  postgres:16-alpine >/dev/null

echo -n "Aguardando o Postgres"
until docker exec "$NOME" pg_isready -U amicats >/dev/null 2>&1; do echo -n "."; sleep 1; done
echo

# Variáveis já definidas (ex.: pelo npm run e2e) vencem o .env. Sem .env, usa o adm padrão.
ENV_FILE=()
if [[ -f .env ]]; then
  ENV_FILE=(--env-file=.env)
else
  export SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@amicats.org}"
  export SEED_ADMIN_SENHA="${SEED_ADMIN_SENHA:-troque-esta-senha}"
fi

DATABASE_URL="$URL" npx prisma migrate deploy >/dev/null
DATABASE_URL="$URL" npx tsx "${ENV_FILE[@]}" prisma/seed.ts

echo
echo "Banco temporário pronto em ${URL}"
echo "Suba a API apontando para ele:"
echo "  DATABASE_URL=${URL} npm run dev"
