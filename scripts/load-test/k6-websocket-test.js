/**
 * k6 WebSocket 压力测试脚本
 * 
 * 运行: k6 run scripts/load-test/k6-websocket-test.js
 */

import ws from 'k6/ws';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('websocket_errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // 50 个连接
    { duration: '1m', target: 100 },   // 100 个连接
    { duration: '1m', target: 200 },   // 200 个连接
    { duration: '30s', target: 0 },    // 逐步断开
  ],
  thresholds: {
    websocket_errors: ['rate<0.01'],
  },
};

const SOCKET_URL = __ENV.SOCKET_URL || 'http://localhost:3001/socket.io/?EIO=4&transport=websocket';
// 注意: k6 的 ws 需要 ws:// 或 wss:// 协议
const WS_URL = SOCKET_URL.replace(/^http/, 'ws');

export default function () {
  // 模拟 JWT token（实际测试中应使用真实 token）
  const token = __ENV.JWT_TOKEN || 'test-token';

  const authQuery = token ? `${WS_URL}${WS_URL.includes('?') ? '&' : '?'}token=${token}` : WS_URL

  const response = ws.connect(authQuery, {}, function (socket) {
    let pingInterval = 25000;
    let namespaceReady = false;

    socket.on('open', function () {
      console.log('WebSocket connected');
    });

    socket.on('message', function (data) {
      const text = data.toString();

      if (text.startsWith('0')) {
        // 握手信息，包含 sid 和 ping 配置
        try {
          const payload = JSON.parse(text.slice(1));
          pingInterval = payload.pingInterval || 25000;

          // 进入默认 namespace
          socket.send('40');
        } catch (err) {
          console.log('Handshake parse error', err);
          errorRate.add(1);
        }
      } else if (text === '40') {
        namespaceReady = true;
        socket.send(
          '42["subscribe:packet","0x1234567890123456789012345678901234567890123456789012345678901234"]'
        );
      } else if (text === '2') {
        // 服务器 ping，回复 pong
        socket.send('3');
      } else if (text.startsWith('42')) {
        try {
          const payload = JSON.parse(text.slice(2));
          check(payload, {
            'received message': () => Array.isArray(payload) && payload.length > 0,
          });
        } catch (err) {
          console.log('Failed to parse payload', err);
          errorRate.add(1);
        }
      } else if (text === '3') {
        // pong
        return;
      } else if (text === '41') {
        console.log('Namespace closed by server');
      }
    });

    socket.on('error', function (e) {
      console.log('WebSocket error:', e);
      errorRate.add(1);
    });

    socket.on('close', function () {
      console.log('WebSocket closed');
    });
  });

  check(response, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}

