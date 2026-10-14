FROM node:24-bookworm-slim AS dependencies

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    PORT=8800 \
    DATA_DIR=/app/data

WORKDIR /app

COPY --from=dependencies /app/server/node_modules ./server/node_modules
COPY server ./server
COPY webapp ./webapp

RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 8800
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8800/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
