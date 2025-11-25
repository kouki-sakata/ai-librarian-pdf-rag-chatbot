# Frontend container for Next.js 16 (React 19)
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# Build
COPY frontend ./frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd frontend && npm run build

# Runtime image
FROM node:20-alpine AS runner
WORKDIR /app/frontend

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=base /app/frontend/.next ./.next
COPY --from=base /app/frontend/node_modules ./node_modules
COPY --from=base /app/frontend/package.json ./package.json
COPY --from=base /app/frontend/public ./public

EXPOSE 3000

CMD ["npm", "start"]
