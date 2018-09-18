# syntax = tonistiigi/dockerfile:runmount20180618

# Build pigpio https://github.com/joan2937/pigpio

FROM arm32v7/debian:stretch as pigpio

RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked --mount=type=cache,target=/var/lib/apt,sharing=locked \
  apt update && apt install -y build-essential curl

RUN curl -L -o pigpio.tar http://abyz.me.uk/rpi/pigpio/pigpio.tar && \
  tar xf pigpio.tar && \
  cd PIGPIO && \
  make && \
  make install

# Build test / development image

FROM arm32v7/node:10-stretch as builder

COPY --from=pigpio /usr/local/include/pigpio.h /usr/local/include/pigpio.h
COPY --from=pigpio /usr/local/lib/libpigpio.so /usr/lib/libpigpio.so

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm install

COPY . ./

RUN npm run build

# Strip test / development image from all compile / dev dependencies

FROM builder as cleaned

RUN npm prune --production

# Build client using only the compiled node modules and runtime dependencies

FROM arm32v7/node:10-stretch

COPY --from=pigpio /usr/local/lib/libpigpio.so /usr/lib/libpigpio.so

WORKDIR /app

COPY --from=cleaned /app .

CMD [ "node", "lib/index.js" ]
