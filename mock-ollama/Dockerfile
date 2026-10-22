FROM node:24-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./

ENV NODE_ENV=production
EXPOSE 11434
USER node

HEALTHCHECK --interval=5s --timeout=3s --retries=20 \
  CMD wget -qO- http://127.0.0.1:11434/health > /dev/null || exit 1

CMD ["node", "server.js"]
