FROM node:20-alpine

WORKDIR /app

# Zero npm dependencies — just copy the app.
COPY package.json ./
COPY server ./server
COPY public ./public

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server/index.js"]
