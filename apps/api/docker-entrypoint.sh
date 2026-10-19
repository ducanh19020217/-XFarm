#!/bin/sh
set -eu

echo 'Applying Prisma migrations...'
/app/node_modules/.bin/prisma migrate deploy --schema /app/packages/db/prisma/schema.prisma

exec "$@"
