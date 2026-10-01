# node-ble is pure JavaScript (dbus-next), so no compiler or native build stage is needed.
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY polar-logger-ble.js polarH7.proto tcp-test-server.js test-parser.js ./
RUN node test-parser.js
ENV NODE_ENV=production \
    OUT_DIR=/data \
    DBUS_SYSTEM_BUS_ADDRESS=unix:path=/run/dbus/system_bus_socket
VOLUME ["/data"]
CMD ["node", "polar-logger-ble.js"]
