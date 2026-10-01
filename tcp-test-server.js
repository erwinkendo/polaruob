// Minimal replacement for tcpServerTest.js: prints newline-delimited JSON from the logger.
const net = require('net');
const port = parseInt(process.env.TCP_PORT || '9000', 10);
net.createServer((conn) => {
  console.log('client connected', conn.remoteAddress);
  let buf = '';
  conn.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (line.trim()) console.log(JSON.parse(line));
    }
  });
  conn.on('error', (e) => console.log('error', e.message));
}).listen(port, () => console.log(`listening on ${port}`));
