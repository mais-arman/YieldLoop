FROM python:3.12-slim
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:0.9.5 /uv /usr/local/bin/uv
ENV UV_PROJECT_ENVIRONMENT=/opt/pythonlibs
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY artifacts/api-server/backend ./artifacts/api-server/backend
COPY artifacts/api-server/run.sh ./artifacts/api-server/run.sh
ENV PORT=8080 DJANGO_ENV=production
USER 10001:10001
EXPOSE 8080
CMD ["sh", "artifacts/api-server/run.sh"]
