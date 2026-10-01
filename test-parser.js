const assert = require('assert');
const { parseHeartRate, normaliseMac } = require('./polar-logger-ble');
assert.deepStrictEqual(parseHeartRate(Buffer.from([0x16, 72, 0x34, 0x03, 0x48, 0x03])),
  { hr: 72, rr: [820, 840], contact: 1, energy: null });
assert.deepStrictEqual(parseHeartRate(Buffer.from([0x19, 0x2c, 0x01, 0xf4, 0x01, 0x00, 0x04])),
  { hr: 300, rr: [1024], contact: null, energy: 500 });
assert.deepStrictEqual(parseHeartRate(Buffer.from([0x00, 60])), { hr: 60, rr: [], contact: null, energy: null });
assert.strictEqual(normaliseMac('0022d0b98acb'), '00:22:D0:B9:8A:CB');
assert.strictEqual(normaliseMac('00:22:d0:b9:8a:cb'), '00:22:D0:B9:8A:CB');
console.log('parser tests passed');
