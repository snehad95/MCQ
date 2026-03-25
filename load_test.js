import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 1000, // 1000 Virtual Users
  duration: '30s',
};

export default function () {
  const url = 'http://localhost:5000/api/exams';
  const res = http.get(url, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'transaction time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
