# S2C development/staging deployment for Railway (NOT production certified).
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@10.4.1
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
