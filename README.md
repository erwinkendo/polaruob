[![DOI](https://zenodo.org/badge/80522752.svg)](https://zenodo.org/badge/latestdoi/80522752)
# Polar H7 data-logger — ROS 2 branch
Logger for polar H7 (or any standard BLE heart-rate strap) and the driver logging system made by Erwin Lopez. It publishes it to ROS 2 with rclnodejs. CSV logging and TCP streaming still work as on `main` Updated to modern standards and container use.

## General use

Connects to a Polar H7 (or any standard BLE heart-rate strap), logs HR and RR intervals to CSV, and optionally streams each sample over TCP. It used a Linux's
`bluetoothd` to do the Bluetooth work over D-Bus. 


## Topics

| Topic | Type | QoS |
|---|---|---|
| `/polar/heart_rate` | `polar_msgs/msg/HeartRate` | reliable, depth 10 |
| `/polar/connected` | `std_msgs/msg/Bool` | reliable, transient local (latched) |

`polar_msgs/msg/HeartRate`: `header`, `sensor_id` (MAC), `heart_rate` (bpm),
`rr_intervals` (float32[], **seconds**, may hold 0–n values), `sensor_contact`
(-1 not supported / 0 lost / 1 ok), `energy_expended` (kJ, -1 if absent).

The namespace and node name can be changed with `POLAR_NAMESPACE` / `POLAR_NODE_NAME`

### General recommendation

Use the docker version, together with the D-bus fix proposed for the native version.

### Docker version

The host's `bluetoothd` must be running; the container only needs its D-Bus socket.

```bash
bluetoothctl power on
docker compose up --build
```

The container uses host networking for DDS discovery and the host's D-Bus socket for
Bluetooth. `FASTDDS_BUILTIN_TRANSPORTS=UDPv4` disables Fast DDS shared memory, which
otherwise silently drops data between the container and host processes.

Remember to build the ros2 msg package to read the heart rate measuremets:

```bash
source /opt/ros/jazzy/setup.bash

cd ros2_ws && colcon build && cd ..
source ros2_ws/install/setup.bash
```

## Citation
Use the Zenodo-enabled service to generate a citation using your favourite style [![DOI](https://zenodo.org/badge/80522752.svg)](https://zenodo.org/badge/latestdoi/80522752)
