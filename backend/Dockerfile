dockerfileFROM node:20-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "run" "start"]