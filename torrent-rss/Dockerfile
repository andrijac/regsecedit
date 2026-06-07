FROM node:20-alpine

WORKDIR /app

# required for better-sqlite3 native addon compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /data

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/torrent-rss.db

CMD ["node", "server.js"]
