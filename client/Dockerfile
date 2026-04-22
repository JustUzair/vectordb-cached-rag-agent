FROM node:25-slim AS builder

WORKDIR /frontend


COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable 
COPY . .
RUN yarn build


# Production Image
FROM node:25-slim AS runner


WORKDIR /frontend
ENV NODE_ENV=production


COPY package.json yarn.lock .yarnrc.yml ./
COPY --from=builder /frontend/node_modules  ./node_modules
COPY --from=builder /frontend/.next  ./.next
COPY --from=builder /frontend/public  ./public



EXPOSE 3000

CMD ["yarn", "start"]
