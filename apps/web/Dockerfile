FROM node:22-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm fetch --frozen-lockfile
COPY . .
RUN pnpm install --offline --frozen-lockfile --config.confirmModulesPurge=false

FROM dependencies AS build

ARG NEXT_PUBLIC_API_URL=http://localhost:4100/api/v1
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3100
ARG WEB_URL=http://localhost:3100
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV WEB_URL=$WEB_URL
ENV NODE_ENV=production

RUN pnpm --filter @xfarm/web build

FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/web/.next ./apps/web/.next
COPY --from=build /workspace/apps/web/public ./apps/web/public
COPY --from=build /workspace/apps/web/package.json ./apps/web/package.json
COPY --from=build /workspace/apps/web/scripts ./apps/web/scripts
COPY --from=build /workspace/packages/shared ./packages/shared
COPY --from=build /workspace/packages/ui ./packages/ui
COPY --from=build /workspace/packages/config ./packages/config

RUN chown -R node:node /app

USER node
WORKDIR /app/apps/web
EXPOSE 3100

CMD ["node", "scripts/start.mjs"]
