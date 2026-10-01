'use strict';
/**
 * Polar H7 (or any BLE Heart Rate strap) -> CSV logger using node-ble (BlueZ over D-Bus).
 * Unlike the noble version, bluetoothd keeps running and no raw-socket capabilities are needed.
 *
 * Config (environment variables):
 *   POLAR_ID       MAC of the strap (00:22:D0:B9:8A:CB or 0022d0b98acb). Empty = match by name.
 *   POLAR_NAME     Substring of the device name to match when POLAR_ID is empty (default "Polar").
 *   BLE_ADAPTER    Adapter name, e.g. hci1 (default: first adapter).
 *   SCAN_TIMEOUT   Seconds to search before retrying (default 60).
 *   OUT_DIR        Folder for CSV files (default ./data).
 *   TCP_HOST / TCP_PORT / TCP_FORMAT   Optional streaming, same as the noble version.
 *   RECONNECT      "0" to exit when the strap disconnects (default: reconnect).
 */
const fs = require('fs');
const path = require('path');
const net = require('net');

// BlueZ exposes full 128-bit UUIDs
const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

function normaliseMac(s) {
  const hex = (s || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
  return hex.length === 12 ? hex.match(/../g).join(':') : '';
}

const cfg = {
  mac: normaliseMac(process.env.POLAR_ID),
  nameMatch: process.env.POLAR_NAME || 'Polar',
  adapter: process.env.BLE_ADAPTER || '',
  scanTimeoutMs: parseInt(process.env.SCAN_TIMEOUT || '60', 10) * 1000,
  outDir: process.env.OUT_DIR || path.join(__dirname, 'data'),
  tcpHost: process.env.TCP_HOST || '',
  tcpPort: parseInt(process.env.TCP_PORT || '9000', 10),
  tcpFormat: (process.env.TCP_FORMAT || 'json').toLowerCase(),
  reconnect: process.env.RECONNECT !== '0',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Heart Rate Measurement (0x2A37) parser, per Bluetooth spec ----------
function parseHeartRate(buf) {
  const flags = buf.readUInt8(0);
  let offset = 1;
  let hr;
  if (flags & 0x01) { hr = buf.readUInt16LE(offset); offset += 2; }
  else { hr = buf.readUInt8(offset); offset += 1; }
  const contact = (flags & 0x04) ? ((flags & 0x02) ? 1 : 0) : null;
  let energy = null;
  if (flags & 0x08) { energy = buf.readUInt16LE(offset); offset += 2; }
  const rr = []; // raw units of 1/1024 s
  if (flags & 0x10) {
    while (offset + 1 < buf.length) { rr.push(buf.readUInt16LE(offset)); offset += 2; }
  }
  return { hr, rr, contact, energy };
}

// ---------- CSV ----------
let csv = null;
function openCsv(tag) {
  fs.mkdirSync(cfg.outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '');
  const file = path.join(cfg.outDir, `polar_${tag}_${ts}.csv`);
  csv = fs.createWriteStream(file, { flags: 'a' });
  csv.write('timestamp,HR,RR,RR_ms,iso_time,contact,energy_kJ\n');
  console.log(`Logging to ${file}`);
}
function closeCsv() { if (csv) { csv.end(); csv = null; } }
function writeRows(ts, m) {
  if (!csv) return;
  const tail = `${new Date(ts).toISOString()},${m.contact ?? ''},${m.energy ?? ''}`;
  if (!m.rr.length) csv.write(`${ts},${m.hr},,,${tail}\n`);
  else for (const r of m.rr) csv.write(`${ts},${m.hr},${r},${(r * 1000 / 1024).toFixed(1)},${tail}\n`);
}

// ---------- Optional TCP ----------
let socket = null, socketReady = false, protoMsg = null;
function startTcp() {
  if (!cfg.tcpHost) return;
  if (cfg.tcpFormat === 'protobuf') {
    protoMsg = require('protocol-buffers')(fs.readFileSync(path.join(__dirname, 'polarH7.proto'))).Test;
  }
  const connect = () => {
    socket = net.createConnection({ host: cfg.tcpHost, port: cfg.tcpPort });
    socket.on('connect', () => { socketReady = true; console.log(`TCP connected to ${cfg.tcpHost}:${cfg.tcpPort}`); });
    socket.on('error', (e) => console.log(`TCP error: ${e.message}`));
    socket.on('close', () => { socketReady = false; setTimeout(connect, 1000); });
  };
  connect();
}
function sendTcp(ts, m) {
  if (!socketReady) return;
  const RR = m.rr.length ? m.rr[0] : -1;
  if (protoMsg) {
    const body = protoMsg.encode({ timestamp: ts, HR: m.hr, RR });
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length, 0);
    socket.write(Buffer.concat([len, body]));
  } else {
    socket.write(JSON.stringify({ timestamp: ts, HR: m.hr, RR, RRs: m.rr }) + '\n');
  }
}

// ---------- BLE via BlueZ / D-Bus ----------
async function findDevice(adapter) {
  if (cfg.mac) {
    console.log(`Waiting for ${cfg.mac}...`);
    return adapter.waitDevice(cfg.mac, cfg.scanTimeoutMs);
  }
  console.log(`Looking for a device named "*${cfg.nameMatch}*"...`);
  const deadline = Date.now() + cfg.scanTimeoutMs;
  while (Date.now() < deadline) {
    for (const mac of await adapter.devices()) {
      const dev = await adapter.getDevice(mac);
      const name = await dev.getName().catch(() => ''); // unnamed devices throw
      if (name.includes(cfg.nameMatch)) { console.log(`Found "${name}" ${mac}`); return dev; }
    }
    await sleep(1000);
  }
  throw new Error('No matching strap found (scan timed out)');
}

async function runSession(device) {
  const mac = await device.getAddress();
  const disconnected = new Promise((resolve) => device.once('disconnect', resolve));
  await device.connect();
  console.log(`Connected to ${mac}`);
  const gatt = await device.gatt(); // waits for ServicesResolved
  const service = await gatt.getPrimaryService(HR_SERVICE);
  const hrChar = await service.getCharacteristic(HR_MEASUREMENT);

  openCsv(mac.replace(/:/g, '').toLowerCase());
  hrChar.on('valuechanged', (data) => {
    const ts = Date.now();
    const m = parseHeartRate(data);
    console.log(`HR ${m.hr} bpm  RR ${m.rr.map((r) => (r * 1000 / 1024).toFixed(0)).join(' ') || '-'} ms`);
    writeRows(ts, m);
    sendTcp(ts, m);
  });
  await hrChar.startNotifications();
  console.log('Subscribed to heart-rate notifications');

  await disconnected;
  hrChar.removeAllListeners('valuechanged');
  console.log('Strap disconnected');
}

async function main() {
  const busPath = (process.env.DBUS_SYSTEM_BUS_ADDRESS || '').replace(/^unix:path=/, '') || '/var/run/dbus/system_bus_socket';
  if (!fs.existsSync(busPath)) {
    throw new Error(`System D-Bus socket not found at ${busPath}. ` +
      'Is dbus running on the host? In Docker, mount -v /run/dbus/system_bus_socket:/run/dbus/system_bus_socket');
  }
  startTcp();
  const { createBluetooth } = require('node-ble');
  const { bluetooth, destroy } = createBluetooth();
  const adapter = cfg.adapter ? await bluetooth.getAdapter(cfg.adapter) : await bluetooth.defaultAdapter();
  if (!(await adapter.isPowered())) {
    throw new Error('Bluetooth adapter is powered off — run: bluetoothctl power on');
  }

  let current = null;
  const shutdown = async () => {
    console.log('Shutting down...');
    closeCsv();
    if (socket) socket.destroy();
    setTimeout(() => process.exit(0), 1500); // hard stop if BlueZ is slow
    try { if (current) await current.disconnect(); } catch (_) { /* already gone */ }
    try { await adapter.stopDiscovery(); } catch (_) { /* not discovering */ }
    destroy();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  for (;;) {
    try {
      if (!(await adapter.isDiscovering())) await adapter.startDiscovery();
      current = await findDevice(adapter);
      await adapter.stopDiscovery().catch(() => {}); // scanning while connected hurts stability
      await runSession(current);
    } catch (e) {
      console.error(`Error: ${e.message}`);
      try { if (current) await current.disconnect(); } catch (_) { /* ignore */ }
    }
    current = null;
    closeCsv();
    if (!cfg.reconnect) break;
    await sleep(2000);
  }
  destroy();
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { parseHeartRate, normaliseMac };
