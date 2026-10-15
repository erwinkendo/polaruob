'use strict';
/**
 * ROS 2 output for polaruob, using rclnodejs.
 *
 * Topics (relative to the node namespace, default /polar):
 *   heart_rate  polar_msgs/msg/HeartRate  one message per BLE notification
 *   connected   std_msgs/msg/Bool         latched (transient local) strap connection state
 *
 * Config (environment variables):
 *   ROS2=0              disable ROS 2 output (CSV/TCP keep working)
 *   POLAR_NODE_NAME     node name (default polar_h7)
 *   POLAR_NAMESPACE     node namespace (default /polar)
 *   POLAR_FRAME_ID      header.frame_id (default polar_h7)
 * Standard --ros-args also work, e.g.:  node polar-logger-ble.js --ros-args -r __ns:=/subject1
 */

const cfg = {
  enabled: process.env.ROS2 !== '0',
  nodeName: process.env.POLAR_NODE_NAME || 'polar_h7',
  namespace: process.env.POLAR_NAMESPACE || '/polar',
  frameId: process.env.POLAR_FRAME_ID || 'polar_h7',
};

/** Convert a parsed measurement into a polar_msgs/msg/HeartRate object. */
function toHeartRateMsg(m, sensorId, stamp, frameId = cfg.frameId) {
  return {
    header: { stamp, frame_id: frameId },
    sensor_id: sensorId || '',
    heart_rate: m.hr,
    rr_intervals: Float32Array.from(m.rr, (r) => r / 1024), // 1/1024 s -> s
    sensor_contact: m.contact === null ? -1 : m.contact,
    energy_expended: m.energy === null ? -1 : m.energy,
  };
}

const noop = { publish() {}, setConnected() {}, shutdown() {} };

/**
 * Start the ROS 2 node. Returns an object with publish(), setConnected() and shutdown().
 * If ROS 2 is disabled, returns no-ops so the logger works unchanged.
 */
async function startRos(rclnodejs) {
  if (!cfg.enabled) return noop;
  rclnodejs = rclnodejs || require('rclnodejs');

  await rclnodejs.init(); // parses --ros-args from process.argv
  const node = new rclnodejs.Node(cfg.nodeName, cfg.namespace);
  const { QoS } = rclnodejs;

  const hrPub = node.createPublisher('polar_msgs/msg/HeartRate', 'heart_rate');

  const latched = new QoS(
    QoS.HistoryPolicy.RMW_QOS_POLICY_HISTORY_KEEP_LAST,
    1,
    QoS.ReliabilityPolicy.RMW_QOS_POLICY_RELIABILITY_RELIABLE,
    QoS.DurabilityPolicy.RMW_QOS_POLICY_DURABILITY_TRANSIENT_LOCAL
  );
  const connPub = node.createPublisher('std_msgs/msg/Bool', 'connected', { qos: latched });
  connPub.publish({ data: false });

  node.spin();
  console.log(`ROS 2 node ${node.getFullyQualifiedName ? node.getFullyQualifiedName() : cfg.nodeName} started`);

  let down = false;
  return {
    publish(m, sensorId) {
      if (down) return;
      hrPub.publish(toHeartRateMsg(m, sensorId, node.now().toMsg()));
    },
    setConnected(value) {
      if (!down) connPub.publish({ data: !!value });
    },
    shutdown() {
      if (down) return;
      try { connPub.publish({ data: false }); } catch (_) { /* ignore */ }
      down = true;
      try { rclnodejs.shutdown(); } catch (_) { /* already down */ }
    },
  };
}

module.exports = { startRos, toHeartRateMsg };
