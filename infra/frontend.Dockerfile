FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json ./
COPY lib ./lib
COPY artifacts/yieldloop ./artifacts/yieldloop
RUN pnpm install --frozen-lockfile
RUN PORT=8081 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/yieldloop run build
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/yieldloop/dist/public /usr/share/nginx/html
EXPOSE 8080
