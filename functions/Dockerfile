# syntax = tonistiigi/dockerfile:runmount20180618

FROM node:8

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm install

COPY . ./

RUN npm run build
