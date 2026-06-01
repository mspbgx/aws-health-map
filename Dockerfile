# --- Stage 1: Build des React/Vite-Frontends ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: schlanke Runtime mit dem Node-Server ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# Nur das Noetige fuer die Laufzeit: gebautes Frontend + Server
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
EXPOSE 8080
# Healthcheck nutzt den eingebauten /healthz-Endpunkt
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server.js"]
