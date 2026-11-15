FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=127.0.0.1 PORT=3000 ASTRA_SPEED=30
COPY package.json package-lock.json ./
COPY packages ./packages
COPY services ./services
COPY apps ./apps
COPY knowledge ./knowledge
COPY models ./models
COPY data/public-metadata ./data/public-metadata
RUN mkdir -p /app/data/runtime && chown -R node:node /app/data/runtime
USER node
CMD ["node", "services/api/server.mjs"]
