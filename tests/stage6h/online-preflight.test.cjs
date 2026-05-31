const assert = require('node:assert/strict');

async function main() {
  let loadError = null;
  let runPreflight = null;

  try {
    ({ runPreflight } = require('../../scripts/stage6h/online-preflight.cjs'));
  } catch (error) {
    loadError = error;
  }

  assert.equal(loadError, null, `online preflight module should load: ${loadError && loadError.message}`);
  assert.equal(typeof runPreflight, 'function');

  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, method: options.method || 'GET', body: options.body || '' });

    if (parsed.pathname === '/api/analyze') {
      assert.equal(options.method, 'POST');
      assert.equal(options.body, 'not an image');
      return new Response(JSON.stringify({
        ok: false,
        status: 'RETRY_REQUIRED',
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: '请求内容无法读取，请重新上传照片后再试。',
          retryable: true
        }
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (parsed.pathname === '/build-meta.json') {
      return new Response(JSON.stringify({
        app: 'palmmi',
        platform: 'cloudflare-pages',
        commit_sha: 'abcdef1234567890abcdef1234567890abcdef12',
        branch: 'main',
        api_calls_made: 0,
        real_qwen_called: false
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response(`<html><title>Palmmi</title><body>Palmmi · 掌纹人格标签 ${parsed.pathname}</body></html>`, {
      status: 200,
      headers: { 'content-type': 'text/html' }
    });
  };

  const result = await runPreflight({
    baseUrl: 'https://example.test',
    fetchImpl,
    timeoutMs: 1000,
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12'
  });

  assert.equal(result.ok, true);
  assert.equal(result.base_url, 'https://example.test');
  assert.equal(result.api_calls_made, 0);
  assert.equal(result.quota_consumed, false);
  assert.equal(result.safety.printed_key, false);
  assert.equal(result.safety.printed_base64, false);
  assert.equal(result.safety.printed_raw_response, false);

  assert.deepEqual(result.pages.map((page) => [page.path, page.http_status, page.palmmi, page.hello_world]), [
    ['/', 200, true, false],
    ['/upload/', 200, true, false],
    ['/result/', 200, true, false],
    ['/poster/', 200, true, false],
    ['/feedback/', 200, true, false]
  ]);

  assert.equal(result.api_invalid_post.path, '/api/analyze');
  assert.equal(result.api_invalid_post.http_status, 400);
  assert.equal(result.api_invalid_post.error_code, 'INVALID_REQUEST_BODY');
  assert.equal(result.api_invalid_post.has_api_key, false);
  assert.equal(result.api_invalid_post.has_base64, false);
  assert.equal(result.api_invalid_post.has_stack, false);
  assert.equal(result.build_meta.http_status, 200);
  assert.equal(result.build_meta.available, true);
  assert.equal(result.build_meta.commit_sha, 'abcdef1234567890abcdef1234567890abcdef12');
  assert.equal(result.build_meta.expected_commit_sha, 'abcdef1234567890abcdef1234567890abcdef12');
  assert.equal(result.build_meta.matches_expected_commit, true);
  assert.equal(result.build_meta.has_api_key, false);
  assert.equal(result.build_meta.has_base64, false);

  const shortCommitResult = await runPreflight({
    baseUrl: 'https://example.test',
    fetchImpl,
    timeoutMs: 1000,
    expectedCommitSha: 'abcdef1'
  });

  assert.equal(shortCommitResult.ok, true);
  assert.equal(shortCommitResult.build_meta.commit_sha, 'abcdef1234567890abcdef1234567890abcdef12');
  assert.equal(shortCommitResult.build_meta.expected_commit_sha, 'abcdef1');
  assert.equal(shortCommitResult.build_meta.matches_expected_commit, true);

  const shortMismatchResult = await runPreflight({
    baseUrl: 'https://example.test',
    fetchImpl,
    timeoutMs: 1000,
    expectedCommitSha: 'abc0000'
  });

  assert.equal(shortMismatchResult.ok, false);
  assert.equal(shortMismatchResult.build_meta.matches_expected_commit, false);

  assert.deepEqual(calls.map((call) => `${call.method} ${call.path}`), [
    'GET /',
    'GET /upload/',
    'GET /result/',
    'GET /poster/',
    'GET /feedback/',
    'POST /api/analyze',
    'GET /build-meta.json',
    'GET /',
    'GET /upload/',
    'GET /result/',
    'GET /poster/',
    'GET /feedback/',
    'POST /api/analyze',
    'GET /build-meta.json',
    'GET /',
    'GET /upload/',
    'GET /result/',
    'GET /poster/',
    'GET /feedback/',
    'POST /api/analyze',
    'GET /build-meta.json'
  ]);

  const mismatchResult = await runPreflight({
    baseUrl: 'https://example.test',
    fetchImpl,
    timeoutMs: 1000,
    expectedCommitSha: 'ffffffffffffffffffffffffffffffffffffffff'
  });

  assert.equal(mismatchResult.ok, false);
  assert.equal(mismatchResult.build_meta.matches_expected_commit, false);

  const helloResult = await runPreflight({
    baseUrl: 'https://example.test',
    timeoutMs: 1000,
    fetchImpl: async () => new Response('<h1>Hello World</h1>', { status: 200 })
  });

  assert.equal(helloResult.ok, false);
  assert.equal(helloResult.pages[0].hello_world, true);

  const transportCalls = [];
  const transportResult = await runPreflight({
    baseUrl: 'https://transport.test',
    timeoutMs: 1000,
    requestImpl: async (url, options) => {
      const parsed = new URL(url);
      transportCalls.push(`${options.method || 'GET'} ${parsed.pathname}`);
      if (parsed.pathname === '/api/analyze') {
        return {
          status: 400,
          contentType: 'application/json',
          text: JSON.stringify({ error: { code: 'INVALID_REQUEST_BODY' } })
        };
      }
      if (parsed.pathname === '/build-meta.json') {
        return {
          status: 404,
          contentType: 'application/json',
          text: JSON.stringify({ ok: false })
        };
      }
      return {
        status: 200,
        contentType: 'text/html',
        text: '<html>Palmmi · 掌纹人格标签</html>'
      };
    }
  });

  assert.equal(transportResult.ok, true);
  assert.deepEqual(transportCalls, [
    'GET /',
    'GET /upload/',
    'GET /result/',
    'GET /poster/',
    'GET /feedback/',
    'POST /api/analyze',
    'GET /build-meta.json'
  ]);

  const attemptCounts = new Map();
  const retryResult = await runPreflight({
    baseUrl: 'https://retry.test',
    timeoutMs: 1000,
    maxAttempts: 2,
    requestImpl: async (url, options) => {
      const parsed = new URL(url);
      const key = `${options.method || 'GET'} ${parsed.pathname}`;
      const count = (attemptCounts.get(key) || 0) + 1;
      attemptCounts.set(key, count);

      if (parsed.pathname === '/result/' && count === 1) {
        return { status: 0, contentType: '', text: '', error_code: 'NETWORK_FAILED' };
      }
      if (parsed.pathname === '/api/analyze') {
        return {
          status: 400,
          contentType: 'application/json',
          text: JSON.stringify({ error: { code: 'INVALID_REQUEST_BODY' } })
        };
      }
      return {
        status: 200,
        contentType: 'text/html',
        text: '<html>Palmmi · 掌纹人格标签</html>'
      };
    }
  });

  assert.equal(retryResult.ok, true);
  assert.equal(retryResult.pages.find((page) => page.path === '/result/').attempts, 2);
  assert.equal(retryResult.build_meta.available, false);

  const defaultRetryCounts = new Map();
  const defaultRetryResult = await runPreflight({
    baseUrl: 'https://default-retry.test',
    timeoutMs: 1000,
    requestImpl: async (url, options) => {
      const parsed = new URL(url);
      const key = `${options.method || 'GET'} ${parsed.pathname}`;
      const count = (defaultRetryCounts.get(key) || 0) + 1;
      defaultRetryCounts.set(key, count);

      if (parsed.pathname === '/upload/' && count < 3) {
        return { status: 0, contentType: '', text: '', error_code: 'NETWORK_FAILED' };
      }
      if (parsed.pathname === '/api/analyze') {
        return {
          status: 400,
          contentType: 'application/json',
          text: JSON.stringify({ error: { code: 'INVALID_REQUEST_BODY' } })
        };
      }
      if (parsed.pathname === '/build-meta.json') {
        return {
          status: 200,
          contentType: 'application/json',
          text: JSON.stringify({ commit_sha: 'abcdef1234567890abcdef1234567890abcdef12', branch: 'main' })
        };
      }
      return {
        status: 200,
        contentType: 'text/html',
        text: '<html>Palmmi · 掌纹人格标签</html>'
      };
    }
  });

  assert.equal(defaultRetryResult.ok, true);
  assert.equal(defaultRetryResult.pages.find((page) => page.path === '/upload/').attempts, 3);

  console.log('Stage 6H online preflight tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
