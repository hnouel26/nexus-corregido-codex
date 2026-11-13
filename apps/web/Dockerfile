FROM node:22-alpine
RUN npm install -g pnpm@9.15.9
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm --filter @nexus/web build
RUN addgroup -S nexus && adduser -S nexus -G nexus && chown -R nexus:nexus /app
USER nexus
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@nexus/web", "start"]
