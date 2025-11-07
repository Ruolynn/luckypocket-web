/**
 * k6 API 压力测试脚本
 * 
 * 安装 k6: https://k6.io/docs/getting-started/installation/
 * 运行: k6 run scripts/load-test/k6-api-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // 10 个用户，持续 30 秒
    { duration: '1m', target: 50 },    // 50 个用户，持续 1 分钟
    { duration: '1m', target: 100 },   // 100 个用户，持续 1 分钟
    { duration: '30s', target: 0 },    // 逐步降至 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% 请求 < 500ms, 99% < 1s
    http_req_failed: ['rate<0.05'],                 // 错误率 < 5% (放宽阈值，因为某些端点可能暂时不可用)
    errors: ['rate<0.05'],
    checks: ['rate>0.8'],                            // 至少 80% 的检查通过
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

// 测试数据
const testAddresses = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  '0x9876543210987654321098765432109876543210',
];

export default function () {
  // 1. 健康检查
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });
  errorRate.add(healthRes.status !== 200);
  apiResponseTime.add(healthRes.timings.duration);

  sleep(0.5);

  // 2. 获取统计信息
  const statsRes = http.get(`${BASE_URL}/api/v1/stats`);
  check(statsRes, {
    'stats status is 200': (r) => r.status === 200,
    'stats has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data !== undefined;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(statsRes.status !== 200);
  apiResponseTime.add(statsRes.timings.duration);

  sleep(0.5);

  // 3. 获取礼物列表
  const giftsRes = http.get(`${BASE_URL}/api/v1/gifts?limit=20&offset=0`);
  check(giftsRes, {
    'gifts list status is 200': (r) => r.status === 200,
    'gifts list has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.gifts);
      } catch {
        return false;
      }
    },
  });
  errorRate.add(giftsRes.status !== 200);
  apiResponseTime.add(giftsRes.timings.duration);

  sleep(0.5);

  // 4. 获取排行榜（使用 week 而不是 7d，避免验证问题）
  const leaderboardRes = http.get(`${BASE_URL}/api/leaderboard?type=luck&range=week`);
  check(leaderboardRes, {
    'leaderboard status is 200': (r) => r.status === 200,
    'leaderboard has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.top !== undefined; // top 可能是空数组，这也是有效数据
      } catch {
        return false;
      }
    },
  });
  errorRate.add(leaderboardRes.status !== 200);
  apiResponseTime.add(leaderboardRes.timings.duration);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  // 简单的文本摘要
  const httpReqs = data.metrics.http_reqs?.values || {}
  const httpDuration = data.metrics.http_req_duration?.values || {}
  const httpFailed = data.metrics.http_req_failed?.values || {}
  
  return `
  ====================
  压力测试结果摘要
  ====================
  总请求数: ${httpReqs.count || 0}
  平均响应时间: ${httpDuration.avg ? httpDuration.avg.toFixed(2) : 'N/A'}ms
  P95 响应时间: ${httpDuration['p(95)'] ? httpDuration['p(95)'].toFixed(2) : 'N/A'}ms
  P99 响应时间: ${httpDuration['p(99)'] ? httpDuration['p(99)'].toFixed(2) : 'N/A'}ms
  错误率: ${httpFailed.rate ? (httpFailed.rate * 100).toFixed(2) : 'N/A'}%
  ====================
  `;
}

