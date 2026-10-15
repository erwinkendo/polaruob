// Tests the ROS 2 layer against a mock rclnodejs, so it runs without ROS installed.
const assert = require('assert');
const { startRos, toHeartRateMsg } = require('./ros2-publisher');

const stamp = { sec: 1, nanosec: 2 };
const msg = toHeartRateMsg({ hr: 72, rr: [1024, 512], contact: 1, energy: null }, 'AA:BB:CC:DD:EE:FF', stamp, 'polar_h7');
assert.strictEqual(msg.heart_rate, 72);
assert.deepStrictEqual(Array.from(msg.rr_intervals), [1, 0.5]);
assert.ok(msg.rr_intervals instanceof Float32Array);
assert.strictEqual(msg.sensor_contact, 1);
assert.strictEqual(msg.energy_expended, -1);
assert.deepStrictEqual(msg.header, { stamp, frame_id: 'polar_h7' });

const none = toHeartRateMsg({ hr: 60, rr: [], contact: null, energy: 12 }, '', stamp);
assert.strictEqual(none.rr_intervals.length, 0);
assert.strictEqual(none.sensor_contact, -1);
assert.strictEqual(none.energy_expended, 12);

// Mock rclnodejs
const published = [];
class QoS { constructor(...a) { this.args = a; } }
QoS.HistoryPolicy = { RMW_QOS_POLICY_HISTORY_KEEP_LAST: 1 };
QoS.ReliabilityPolicy = { RMW_QOS_POLICY_RELIABILITY_RELIABLE: 1 };
QoS.DurabilityPolicy = { RMW_QOS_POLICY_DURABILITY_TRANSIENT_LOCAL: 1 };
const mock = {
  QoS,
  init: async () => {},
  shutdown: () => published.push(['shutdown']),
  Node: class {
    constructor(name, ns) { this.name = name; this.ns = ns; }
    createPublisher(type, topic, opts) { return { publish: (m) => published.push([type, topic, m, opts]) }; }
    now() { return { toMsg: () => stamp }; }
    spin() {}
  },
};

(async () => {
  const ros = await startRos(mock);
  ros.setConnected(true);
  ros.publish({ hr: 80, rr: [800], contact: 1, energy: null }, 'AA:BB:CC:DD:EE:FF');
  ros.shutdown();
  ros.publish({ hr: 81, rr: [], contact: 1, energy: null }, 'x'); // ignored after shutdown

  const topics = published.map((p) => p[1] || p[0]);
  assert.deepStrictEqual(topics, ['connected', 'connected', 'heart_rate', 'connected', 'shutdown']);
  assert.strictEqual(published[2][0], 'polar_msgs/msg/HeartRate');
  assert.strictEqual(published[2][2].heart_rate, 80);
  assert.ok(published[0][3].qos instanceof QoS, 'connected topic uses latched QoS');
  console.log('ros2 tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
