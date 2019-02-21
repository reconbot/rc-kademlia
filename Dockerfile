FROM mhart/alpine-node:10

WORKDIR /app
COPY . .

RUN npm install --prod
RUN npm run build

ENV "DEBUG" "rck:*"
CMD ["node", "bin/start"]
