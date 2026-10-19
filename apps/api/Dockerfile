FROM node:22-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm fetch --frozen-lockfile
COPY . .
RUN pnpm install --offline --frozen-lockfile --config.confirmModulesPurge=false

FROM dependencies AS build

RUN pnpm --filter @xfarm/db db:generate
RUN pnpm --filter @xfarm/api build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

COPY --from=base /usr/local/bin/corepack /usr/local/bin/corepack
COPY --from=base /usr/local/lib/node_modules/corepack /usr/local/lib/node_modules/corepack
COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/packages/db ./packages/db
COPY --from=build /workspace/packages/shared ./packages/shared
COPY --from=build /workspace/packages/config ./packages/config
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod 755 /usr/local/bin/docker-entrypoint.sh \
  && chown -R node:node /app /usr/local/bin/docker-entrypoint.sh

USER node
WORKDIR /app/apps/api
EXPOSE 4100

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "--import", "tsx", "dist/src/main.js"]
