FROM node:25-slim AS builder

WORKDIR /backend


COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable 
COPY . .
RUN yarn build


# Production Image
FROM node:25-slim AS runner


WORKDIR /backend
ENV NODE_ENV=production
ENV IS_DOCKER=true


COPY package.json yarn.lock .yarnrc.yml ./
COPY --from=builder /backend/node_modules ./node_modules
COPY --from=builder /backend/dist ./dist

EXPOSE 8000

CMD ["node", "dist/index.js"]
