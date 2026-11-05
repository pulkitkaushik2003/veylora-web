FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

ENV PORT=10000 \
    API_URL=http://host.docker.internal:2626

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/normalize-api-url.envsh /docker-entrypoint.d/05-normalize-api-url.envsh
COPY --from=build /app/dist/veylora-web/browser /usr/share/nginx/html

EXPOSE 10000
