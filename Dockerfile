# Production Dockerfile for the Accessible Component Examples
# Stage 1 runs the axe-core + keyboard suite; the image only builds if it passes.
FROM mcr.microsoft.com/playwright:v1.64.1-noble AS tester
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY playwright.config.js ./
COPY scripts ./scripts
COPY examples ./examples
COPY tests ./tests
ENV CI=true
RUN npx playwright test

# Stage 2 serves the static examples with nginx running as a non-root user on port 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine AS runner
COPY --from=tester --chown=nginx:nginx /app/examples /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
