# ROS 2 Jazzy (Ubuntu 24.04) + Node.js 22 + polar_msgs
FROM ros:jazzy-ros-base
SHELL ["/bin/bash", "-c"]

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# 1. Build the message package
WORKDIR /ros2_ws
COPY ros2_ws/src ./src
RUN source /opt/ros/jazzy/setup.bash \
 && colcon build \
 && rm -rf build log

# 2. Install npm deps with ROS + polar_msgs sourced, so rclnodejs generates bindings for them
WORKDIR /app
COPY package.json package-lock.json* ./
RUN source /opt/ros/jazzy/setup.bash \
 && source /ros2_ws/install/setup.bash \
 && if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY polar-logger-ble.js ros2-publisher.js polarH7.proto tcp-test-server.js test-parser.js test-ros2.js ./
RUN node test-parser.js && node test-ros2.js

COPY docker-entrypoint.sh /docker-entrypoint.sh
ENV OUT_DIR=/data \
    DBUS_SYSTEM_BUS_ADDRESS=unix:path=/run/dbus/system_bus_socket
VOLUME ["/data"]
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "polar-logger-ble.js"]
