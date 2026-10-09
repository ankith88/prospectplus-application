#!/usr/bin/env node

/**
 * ProspectPlus Comprehensive Application Stress & Load Testing Suite
 * Evaluates throughput, concurrency limits, latency percentiles, error rates, and burst resilience.
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.TARGET_URL || 'http://localhost:9002';
const parsedBase = new URL(BASE_URL);
const isHttps = parsedBase.protocol === 'https:';
const client = isHttps ? https : http;

// Custom HTTP Agent with connection reuse and high socket pool
const agent = new client.Agent({
  keepAlive: true,
  maxSockets: 300,
  maxFreeSockets: 100,
  timeout: 10000,
});

// Helper for HTTP requests
function makeRequest({ path, method = 'GET', headers = {}, body = null, timeout = 10000 }) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const reqHeaders = {
      'User-Agent': 'ProspectPlus-StressTester/1.0',
      'Accept': '*/*',
      ...headers,
    };

    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
    }

    const req = client.request(
      {
        protocol: parsedBase.protocol,
        hostname: parsedBase.hostname,
        port: parsedBase.port,
        path,
        method,
        headers: reqHeaders,
        agent,
        timeout,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          const duration = performance.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            duration,
            bodyLength: responseData.length,
            error: null,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      const duration = performance.now() - startTime;
      resolve({
        statusCode: 0,
        duration,
        bodyLength: 0,
        error: 'TIMEOUT',
      });
    });

    req.on('error', (err) => {
      const duration = performance.now() - startTime;
      resolve({
        statusCode: 0,
        duration,
        bodyLength: 0,
        error: err.code || err.message,
      });
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Statistical calculation
function calculateStats(results) {
  const durations = results.map((r) => r.duration).sort((a, b) => a - b);
  const statusCodes = {};
  let errors = 0;
  let totalDuration = 0;

  for (const r of results) {
    if (r.error || r.statusCode === 0) {
      errors++;
      const errKey = r.error || 'UNKNOWN_ERROR';
      statusCodes[errKey] = (statusCodes[errKey] || 0) + 1;
    } else {
      const codeKey = `${r.statusCode}`;
      statusCodes[codeKey] = (statusCodes[codeKey] || 0) + 1;
    }
    totalDuration += r.duration;
  }

  const count = durations.length;
  const p = (percentile) => {
    if (count === 0) return 0;
    const idx = Math.min(Math.floor((percentile / 100) * count), count - 1);
    return durations[idx];
  };

  return {
    total: count,
    errors,
    errorRate: count > 0 ? ((errors / count) * 100).toFixed(2) + '%' : '0%',
    min: durations[0] ? durations[0].toFixed(2) : '0',
    mean: count > 0 ? (totalDuration / count).toFixed(2) : '0',
    p50: p(50).toFixed(2),
    p90: p(90).toFixed(2),
    p95: p(95).toFixed(2),
    p99: p(99).toFixed(2),
    max: durations[count - 1] ? durations[count - 1].toFixed(2) : '0',
    statusCodes,
  };
}

// Concurrency runner
async function runConcurrentBatch({ path, method = 'GET', headers = {}, body = null, totalRequests, concurrency }) {
  const results = [];
  let completed = 0;
  const startTime = performance.now();

  async function worker() {
    while (completed < totalRequests) {
      completed++;
      const res = await makeRequest({ path, method, headers, body });
      results.push(res);
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  const totalElapsed = performance.now() - startTime;
  const rps = ((results.length / (totalElapsed / 1000)) || 0).toFixed(1);

  return {
    ...calculateStats(results),
    totalElapsedMs: totalElapsed.toFixed(0),
    rps,
  };
}

// Format output table
function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80));
}

function printResultRow(name, res) {
  console.log(`\n▶ [${name}]`);
  console.log(`  • Requests:    ${res.total} total across ${res.totalElapsedMs}ms (${res.rps} req/sec)`);
  console.log(`  • Latency:     p50: ${res.p50}ms | p90: ${res.p90}ms | p95: ${res.p95}ms | p99: ${res.p99}ms | max: ${res.max}ms`);
  console.log(`  • Status Code: ${JSON.stringify(res.statusCodes)}`);
  console.log(`  • Errors:      ${res.errors} (${res.errorRate})`);
}

async function runAllTests() {
  console.log(`\n================================================================================`);
  console.log(`  🚀 PROSPECTPLUS COMPREHENSIVE STRESS & LOAD TESTING SUITE`);
  console.log(`  Target Server: ${BASE_URL}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`================================================================================`);

  // Warmup
  console.log('\n[Phase 0] Warming up connection pool...');
  await makeRequest({ path: '/signin' });
  await makeRequest({ path: '/leads' });
  await makeRequest({ path: '/api/auth/2fa/send', method: 'POST', body: JSON.stringify({ email: 'test@mailplus.com.au' }) });

  const summary = [];

  // ==========================================
  // PHASE 1: Static & Pre-Rendered Pages
  // ==========================================
  printHeader('PHASE 1: Core Web Pages & SSR Stress (Concurrency: 50 -> 100)');

  const signinTest = await runConcurrentBatch({
    path: '/signin',
    totalRequests: 200,
    concurrency: 50,
  });
  printResultRow('Sign-In Page (/signin) [200 reqs @ 50 conn]', signinTest);
  summary.push({ name: 'Sign-In Page', rps: signinTest.rps, p95: signinTest.p95, errors: signinTest.errors });

  const resetPassTest = await runConcurrentBatch({
    path: '/reset-password',
    totalRequests: 200,
    concurrency: 50,
  });
  printResultRow('Password Reset (/reset-password) [200 reqs @ 50 conn]', resetPassTest);
  summary.push({ name: 'Password Reset Page', rps: resetPassTest.rps, p95: resetPassTest.p95, errors: resetPassTest.errors });

  const leadsPageTest = await runConcurrentBatch({
    path: '/leads',
    totalRequests: 200,
    concurrency: 50,
  });
  printResultRow('Main Leads Dashboard (/leads) [200 reqs @ 50 conn]', leadsPageTest);
  summary.push({ name: 'Leads Dashboard', rps: leadsPageTest.rps, p95: leadsPageTest.p95, errors: leadsPageTest.errors });

  const ticketsPageTest = await runConcurrentBatch({
    path: '/app-tickets',
    totalRequests: 200,
    concurrency: 50,
  });
  printResultRow('App Tickets (/app-tickets) [200 reqs @ 50 conn]', ticketsPageTest);
  summary.push({ name: 'App Tickets', rps: ticketsPageTest.rps, p95: ticketsPageTest.p95, errors: ticketsPageTest.errors });

  // ==========================================
  // PHASE 2: Auth & 2FA API Endpoints Stress
  // ==========================================
  printHeader('PHASE 2: API Endpoints & 2FA Handlers Stress');

  const twoFaSendTest = await runConcurrentBatch({
    path: '/api/auth/2fa/send',
    method: 'POST',
    body: JSON.stringify({ email: 'nonexistent-stress-test@mailplus.com.au' }),
    totalRequests: 200,
    concurrency: 50,
  });
  printResultRow('2FA Send Code API (/api/auth/2fa/send) [200 reqs @ 50 conn]', twoFaSendTest);
  summary.push({ name: '2FA Send Code API', rps: twoFaSendTest.rps, p95: twoFaSendTest.p95, errors: twoFaSendTest.errors });

  const twoFaVerifyTest = await runConcurrentBatch({
    path: '/api/auth/2fa/verify',
    method: 'POST',
    body: JSON.stringify({ uid: 'stress-test-uid', code: '123456' }),
    totalRequests: 200,
    concurrency: 50,
  });
  printResultRow('2FA Verify Code API (/api/auth/2fa/verify) [200 reqs @ 50 conn]', twoFaVerifyTest);
  summary.push({ name: '2FA Verify Code API', rps: twoFaVerifyTest.rps, p95: twoFaVerifyTest.p95, errors: twoFaVerifyTest.errors });

  const totpConfirmTest = await runConcurrentBatch({
    path: '/api/auth/2fa/totp/confirm',
    method: 'POST',
    body: JSON.stringify({ uid: 'stress-test-uid', code: '999999', secret: 'JBSWY3DPEHPK3PXP' }),
    totalRequests: 200,
    concurrency: 50,
  });
  printResultRow('TOTP Confirm API (/api/auth/2fa/totp/confirm) [200 reqs @ 50 conn]', totpConfirmTest);
  summary.push({ name: 'TOTP Confirm API', rps: totpConfirmTest.rps, p95: totpConfirmTest.p95, errors: totpConfirmTest.errors });

  // ==========================================
  // PHASE 3: High-Concurrency Burst & Spike Testing
  // ==========================================
  printHeader('PHASE 3: High-Concurrency Burst & Spike Test (150 Concurrent Connections)');

  const burstTest = await runConcurrentBatch({
    path: '/signin',
    totalRequests: 500,
    concurrency: 150,
  });
  printResultRow('⚡ Spike Burst (/signin) [500 reqs @ 150 conn]', burstTest);
  summary.push({ name: 'High Burst Spike (150 conn)', rps: burstTest.rps, p95: burstTest.p95, errors: burstTest.errors });

  // ==========================================
  // PHASE 4: Security & Payload Fuzzing / DoS Resilience
  // ==========================================
  printHeader('PHASE 4: Security & Malformed Payload Fuzzing');

  // Test 4a: Malformed JSON
  const malformedTest = await runConcurrentBatch({
    path: '/api/auth/2fa/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ "uid": "fuzzer", "code": ', // broken json
    totalRequests: 50,
    concurrency: 10,
  });
  printResultRow('Malformed JSON Fuzzing [50 reqs @ 10 conn]', malformedTest);
  summary.push({ name: 'Malformed JSON Handling', rps: malformedTest.rps, p95: malformedTest.p95, errors: malformedTest.errors });

  // Test 4b: Oversized Payload (100KB body)
  const largeBody = JSON.stringify({
    uid: 'stress-test-uid',
    code: '123456',
    junkData: 'A'.repeat(100 * 1024),
  });
  const largePayloadTest = await runConcurrentBatch({
    path: '/api/auth/2fa/verify',
    method: 'POST',
    body: largeBody,
    totalRequests: 50,
    concurrency: 10,
  });
  printResultRow('100KB Payload Injection [50 reqs @ 10 conn]', largePayloadTest);
  summary.push({ name: 'Large Payload Injection', rps: largePayloadTest.rps, p95: largePayloadTest.p95, errors: largePayloadTest.errors });

  // ==========================================
  // FINAL BENCHMARK SUMMARY & SCORECARD
  // ==========================================
  printHeader('📊 FINAL BENCHMARK SUMMARY & SCORECARD');
  console.table(summary);

  const totalErrors = summary.reduce((acc, curr) => acc + curr.errors, 0);
  console.log(`\n🏆 STRESS TEST ASSESSMENT:`);
  if (totalErrors === 0) {
    console.log(`  ✅ STATUS: PASSED - 0 Fatal Crashes, 0 Connection Dropouts.`);
    console.log(`  ✅ The application demonstrates robust high-concurrency handling.`);
  } else {
    console.log(`  ⚠️ STATUS: COMPLETED WITH ${totalErrors} ERRORS - Review status code breakdowns.`);
  }
  console.log('================================================================================\n');
}

runAllTests().catch((err) => {
  console.error('Fatal Stress Test Error:', err);
  process.exit(1);
});
