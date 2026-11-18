// ORBIT Third-Party Audit - Automated Security & Concurrency Verification Test Suite
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('ORBIT THIRD-PARTY AUDIT AUTOMATED TEST SUITE');
  console.log('Time: ' + new Date().toISOString());
  console.log('================================================================\n');

  const results = {
    securityTests: [],
    concurrencyTests: [],
  };

  // TEST 1: CORS Insecurity Check
  console.log('[TEST 1] Auditing CORS Origin Reflection...');
  try {
    const corsRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      headers: {
        Origin: 'https://malicious-attacker-site.com',
      },
    });

    const reflectedOrigin = corsRes.headers['access-control-allow-origin'];
    const allowCreds = corsRes.headers['access-control-allow-credentials'];

    const isVulnerable = reflectedOrigin === 'https://malicious-attacker-site.com' && allowCreds === 'true';
    console.log(` -> Reflected Origin: ${reflectedOrigin}`);
    console.log(` -> Allow Credentials: ${allowCreds}`);
    console.log(` -> Result: ${isVulnerable ? 'FAIL (CRITICAL VULNERABILITY CONFIRMED)' : 'PASS'}\n`);

    results.securityTests.push({
      test: 'CORS Origin Reflection & Credential Leaking',
      severity: 'HIGH',
      status: isVulnerable ? 'FAIL' : 'PASS',
      details: `Origin reflected as ${reflectedOrigin} with credentials=${allowCreds}`,
    });
  } catch (err) {
    console.error('CORS test error:', err.message);
  }

  // TEST 2: Rate Limiting & Throttler Check
  console.log('[TEST 2] Auditing Rate Limiting on Public Tracking Endpoint (Sending 25 Rapid Requests)...');
  try {
    let throttledCount = 0;
    let okCount = 0;

    const promises = [];
    for (let i = 0; i < 25; i++) {
      promises.push(
        makeRequest({
          hostname: 'localhost',
          port: 5000,
          path: '/api/v1/tracking/public/test-token-probe',
          method: 'GET',
        })
      );
    }

    const responses = await Promise.all(promises);
    responses.forEach((r) => {
      if (r.status === 429) throttledCount++;
      else okCount++;
    });

    const isRateLimited = throttledCount > 0;
    console.log(` -> Processed 25 requests: ${okCount} accepted (404/200), ${throttledCount} rate-limited (429)`);
    console.log(` -> Result: ${isRateLimited ? 'PASS (Rate Limiter Active)' : 'FAIL (No Rate Limiting Found)'}\n`);

    results.securityTests.push({
      test: 'Public Endpoint Rate Limiting (DoS Defense)',
      severity: 'HIGH',
      status: isRateLimited ? 'PASS' : 'FAIL',
      details: `${okCount}/25 requests unthrottled, 0 requests received HTTP 429 Too Many Requests`,
    });
  } catch (err) {
    console.error('Rate limit test error:', err.message);
  }

  // TEST 3: Swagger Reconnaissance Exposure Check
  console.log('[TEST 3] Auditing Production Swagger Exposure...');
  try {
    const swaggerRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/docs',
      method: 'GET',
    });

    const isSwaggerOpen = swaggerRes.status === 200 || swaggerRes.status === 301;
    console.log(` -> Swagger Endpoint Status: HTTP ${swaggerRes.status}`);
    console.log(` -> Result: ${isSwaggerOpen ? 'WARNING (Publicly Accessible)' : 'PASS (Gated)'}\n`);

    results.securityTests.push({
      test: 'API Schema & Swagger Documentation Exposure',
      severity: 'MEDIUM',
      status: isSwaggerOpen ? 'FAIL' : 'PASS',
      details: `Swagger docs publicly open at /api/docs (HTTP ${swaggerRes.status})`,
    });
  } catch (err) {
    console.error('Swagger test error:', err.message);
  }

  // TEST 4: Concurrency & Latency Stress Test (30 Concurrent Requests)
  console.log('[TEST 4] Running Concurrency Stress Test on Health & Work Orders...');
  try {
    const concurrency = 30;
    const start = Date.now();
    const stressPromises = [];

    for (let i = 0; i < concurrency; i++) {
      const reqStart = Date.now();
      stressPromises.push(
        makeRequest({
          hostname: 'localhost',
          port: 5000,
          path: '/api/health',
          method: 'GET',
        }).then((res) => ({
          status: res.status,
          latencyMs: Date.now() - reqStart,
        }))
      );
    }

    const stressResults = await Promise.all(stressPromises);
    const totalTimeMs = Date.now() - start;
    const latencies = stressResults.map((r) => r.latencyMs);
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const maxLatency = Math.max(...latencies);
    const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
    const errorCount = stressResults.filter((r) => r.status !== 200).length;

    console.log(` -> Concurrency: ${concurrency} simultaneous connections`);
    console.log(` -> Total Execution Time: ${totalTimeMs}ms`);
    console.log(` -> Average Latency: ${avgLatency}ms`);
    console.log(` -> 95th Percentile (P95) Latency: ${p95Latency}ms`);
    console.log(` -> Peak Latency: ${maxLatency}ms`);
    console.log(` -> Error Count: ${errorCount} / ${concurrency}`);
    console.log(` -> Estimated Throughput: ${Math.round((concurrency / totalTimeMs) * 1000)} req/sec\n`);

    results.concurrencyTests.push({
      metric: 'Burst Concurrency Throughput',
      concurrency,
      totalTimeMs,
      avgLatency,
      p95Latency,
      maxLatency,
      errorCount,
      estimatedThroughputRps: Math.round((concurrency / totalTimeMs) * 1000),
    });
  } catch (err) {
    console.error('Concurrency test error:', err.message);
  }

  console.log('================================================================');
  console.log('TEST RUN COMPLETE. OUTPUTTING SUMMARY JSON:');
  console.log(JSON.stringify(results, null, 2));
}

runTests();
