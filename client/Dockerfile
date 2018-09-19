# Workaround to build arm images on x64,
# instead registering binfmt with `C` and `F` should be
# done as done here https://github.com/linuxkit/linuxkit/blob/ae0ddb20539e8e4224e0e8646c156f44f568edd6/pkg/binfmt/etc/binfmt.d/00_linuxkit.conf#L2,
# but this requires kernel 4.8+, which isn't available on circleci

FROM linuxkit/binfmt:v0.6 as binfmt

# Build pigpio https://github.com/joan2937/pigpio

FROM arm32v7/debian:stretch as pigpio

COPY --from=binfmt /usr/bin/qemu-arm /usr/bin/qemu-arm-static

RUN apt-get update && \
  apt-get install -y build-essential curl && \
  rm -rf /var/lib/apt/lists/*

RUN curl -L -o pigpio.tar http://abyz.me.uk/rpi/pigpio/pigpio.tar && \
  tar xf pigpio.tar && \
  cd PIGPIO && \
  make && \
  make install

# Build test / development image

FROM arm32v7/node:10-stretch as builder

COPY --from=binfmt /usr/bin/qemu-arm /usr/bin/qemu-arm-static

COPY --from=pigpio /usr/local/include/pigpio.h /usr/local/include/pigpio.h
COPY --from=pigpio /usr/local/lib/libpigpio.so /usr/lib/libpigpio.so

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . ./

RUN npm run build

# Strip test / development image from all compile / dev dependencies

FROM builder as cleaned

RUN npm prune --production

# Build client using only the compiled node modules and runtime dependencies

FROM arm32v7/node:10-stretch

COPY --from=binfmt /usr/bin/qemu-arm /usr/bin/qemu-arm-static

COPY --from=pigpio /usr/local/lib/libpigpio.so /usr/lib/libpigpio.so

WORKDIR /app

COPY --from=cleaned /app .

CMD [ "node", "lib/index.js" ]
