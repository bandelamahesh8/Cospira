import http from 'k6/http';
import { check, sleep } from 'k6';
import { WebSocket } from 'k6/ws';

export const options = {
    vus: 10,
    duration: '30s',
};

export default function () {
    const url = 'http://localhost:8080';
    const res = http.get(url);
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}
// Note: k6 WebSocket testing requires a different approach and might need xk6-browser or just ws protocol.
// Standard k6 supports ws.
// However, for this basic load test, checking the HTTP endpoint is a good start.
// To test WebSocket connection:
/*
export default function () {
  const url = 'ws://localhost:3001';
  const params = { tags: { my_tag: 'hello' } };

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', function open() {
      console.log('connected');
      socket.close();
    });
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
*/
