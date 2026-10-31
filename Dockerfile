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

# Stage 2 serves the static examples with nginx.
FROM nginx:stable-alpine AS runner
COPY --from=tester /app/examples /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null || exit 1
