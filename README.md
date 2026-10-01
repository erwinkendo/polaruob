[![DOI](https://zenodo.org/badge/80522752.svg)](https://zenodo.org/badge/latestdoi/80522752)
# Polar H7 data-logger
Logger for polar H7 and the driver logging system made by Erwin Lopez. Updated to modern standards and container use.

## General use

Connects to a Polar H7 (or any standard BLE heart-rate strap), logs HR and RR intervals to CSV, and optionally streams each sample over TCP. It used a Linux's
`bluetoothd` to do the Bluetooth work over D-Bus. 

### General recommendation

Use the docker version, together with the D-bus fix proposed for the native version.

### Docker version

The host's `bluetoothd` must be running; the container only needs its D-Bus socket.

```bash
bluetoothctl power on
docker compose up --build
```

Without compose:

```bash
docker build -t polaruob-ble .
docker run --rm -it --init \
  -v /run/dbus/system_bus_socket:/run/dbus/system_bus_socket \
  -v "$PWD/data:/data" -e POLAR_ID=00:22:D0:B9:8A:CB polaruob-ble
```

The container runs as root, which the stock BlueZ D-Bus policy already allows, so the
`node-ble.conf` step is only needed for native runs as a normal user. To run the
container as a non-root UID instead, add `user: "1000:1000"` and create the policy file on
the host with `policy user="1000"`.

### Native version

```bash
sudo apt update
sudo apt install -y bluetooth bluez
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Let your user talk to org.bluez on the system bus (from the node-ble README)
echo '<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
  "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>
  <policy user="__USERID__">
    <allow own="org.bluez"/>
    <allow send_destination="org.bluez"/>
    <allow send_interface="org.bluez.GattCharacteristic1"/>
    <allow send_interface="org.bluez.GattDescriptor1"/>
    <allow send_interface="org.freedesktop.DBus.ObjectManager"/>
    <allow send_interface="org.freedesktop.DBus.Properties"/>
  </policy>
</busconfig>' | sed "s/__USERID__/$(id -un)/" | sudo tee /etc/dbus-1/system.d/node-ble.conf > /dev/null
sudo systemctl reload dbus

sudo rfkill unblock bluetooth
bluetoothctl power on

npm install
npm test
POLAR_ID=00:22:D0:B9:8A:CB npm start     # or omit POLAR_ID to match "Polar" in the name
```

To find the MAC: `bluetoothctl scan le` while wearing the strap, and look for "Polar H7 …".

### Troubleshooting

- `org.freedesktop.DBus.Error.AccessDenied`: D-Bus policy problem; see above.
- Calls fail and `sudo journalctl -k | grep DENIED` shows `dbus` entries: the host's
  AppArmor is mediating D-Bus for the container. Uncomment `security_opt: apparmor:unconfined`.
- `No available adapters found`: bluetoothd isn't running, or the adapter is blocked
  (`rfkill list`).
- Connects then drops right away: remove the stale entry with `bluetoothctl remove <MAC>`
  and try again.
  
## Citation
Use the Zenodo-enabled service to generate a citation using your favourite style [![DOI](https://zenodo.org/badge/80522752.svg)](https://zenodo.org/badge/latestdoi/80522752)
