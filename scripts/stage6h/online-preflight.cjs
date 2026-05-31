#!/usr/bin/env node

const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const tls = require('node:tls');

const DEFAULT_BASE_URL = 'https://palmmi.onebluecloud723.workers.dev';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_ATTEMPTS = 4;
const PAGE_PATHS = ['/', '/upload/', '/result/', '/poster/', '/feedback/'];

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    expectedCommitSha: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base-url') {
      options.baseUrl = argv[index + 1];
      index += 1;
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--max-attempts') {
      options.maxAttempts = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--expect-commit') {
      options.expectedCommitSha = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.baseUrl || typeof options.baseUrl !== 'string') {
    throw new Error('--base-url is required');
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error('--timeout-ms must be a positive number');
  }

  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts <= 0) {
    throw new Error('--max-attempts must be a positive integer');
  }

  options.baseUrl = options.baseUrl.replace(/\/+$/, '');
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/stage6h/online-preflight.cjs [--base-url URL] [--timeout-ms MS] [--max-attempts N] [--expect-commit SHA]

Runs a zero-cost online preflight:
- GET /, /upload/, /result/, /poster/, /feedback/
- POST /api/analyze with invalid text/plain body

It does not upload a real image and does not call Qwen.`);
}

function hasApiKeyMarker(text) {
  return /api[_-]?key|secret|token|sk-[a-z0-9_-]+|dashscope/i.test(text);
}

function hasBase64Marker(text) {
  return /data:image\/[a-z0-9.+-]+;base64,|base64/i.test(text);
}

function hasStackMarker(text) {
  return /\bat\s+[\w.$<>]+\s*\(|stack\s*[:=]|\.js:\d+:\d+/i.test(text);
}

function hasRawResponseMarker(text) {
  return /raw[_ -]?provider|raw[_ -]?response|choices"\s*:|dashscope.aliyuncs.com/i.test(text);
}

async function fetchText(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      text,
      contentType: response.headers && response.headers.get
        ? response.headers.get('content-type') || ''
        : ''
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      text: '',
      contentType: '',
      error_code: error && error.name === 'AbortError' ? 'REQUEST_TIMEOUT' : 'NETWORK_FAILED',
      error_message: error && error.message ? error.message : String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function noProxyMatches(hostname) {
  const value = process.env.NO_PROXY || process.env.no_proxy || '';
  if (!value) return false;
  return value.split(',').map((entry) => entry.trim()).filter(Boolean).some((entry) => {
    if (entry === '*') return true;
    if (entry.startsWith('.')) return hostname.endsWith(entry);
    return hostname === entry || hostname.endsWith(`.${entry}`);
  });
}

function getProxyForUrl(targetUrl) {
  if (noProxyMatches(targetUrl.hostname)) {
    return null;
  }

  const proxy = targetUrl.protocol === 'https:'
    ? (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy)
    : (process.env.HTTP_PROXY || process.env.http_proxy);

  return proxy ? new URL(proxy) : null;
}

function decodeChunkedBody(buffer) {
  let offset = 0;
  const chunks = [];

  while (offset < buffer.length) {
    const lineEnd = buffer.indexOf('\r\n', offset, 'utf8');
    if (lineEnd === -1) return buffer;

    const sizeLine = buffer.slice(offset, lineEnd).toString('ascii').split(';')[0].trim();
    const size = Number.parseInt(sizeLine, 16);
    if (!Number.isFinite(size)) return buffer;

    offset = lineEnd + 2;
    if (size === 0) {
      break;
    }

    chunks.push(buffer.slice(offset, offset + size));
    offset += size + 2;
  }

  return Buffer.concat(chunks);
}

function parseRawHttpResponse(buffer) {
  const headerEnd = buffer.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    return {
      status: 0,
      contentType: '',
      text: ''
    };
  }

  const headerText = buffer.slice(0, headerEnd).toString('latin1');
  const bodyBuffer = buffer.slice(headerEnd + 4);
  const headerLines = headerText.split('\r\n');
  const statusMatch = headerLines[0].match(/\s(\d{3})\s/);
  const headers = new Map();

  for (const line of headerLines.slice(1)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }

  const transferEncoding = headers.get('transfer-encoding') || '';
  const decodedBody = /chunked/i.test(transferEncoding) ? decodeChunkedBody(bodyBuffer) : bodyBuffer;

  return {
    status: statusMatch ? Number(statusMatch[1]) : 0,
    contentType: headers.get('content-type') || '',
    text: decodedBody.toString('utf8')
  };
}

function requestDirect(targetUrl, options, timeoutMs) {
  const client = targetUrl.protocol === 'https:' ? https : http;
  const body = options.body || '';
  const headers = {
    accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    'accept-encoding': 'identity',
    'user-agent': 'Palmmi-Stage6H-Preflight/1.0',
    ...(options.headers || {})
  };

  if (body) {
    headers['content-length'] = Buffer.byteLength(body);
  }

  return new Promise((resolve) => {
    const request = client.request({
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: options.method || 'GET',
      headers,
      timeout: timeoutMs
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        resolve({
          status: response.statusCode || 0,
          contentType: response.headers['content-type'] || '',
          text: Buffer.concat(chunks).toString('utf8')
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('REQUEST_TIMEOUT'));
    });
    request.on('error', (error) => {
      resolve({
        status: 0,
        contentType: '',
        text: '',
        error_code: error && error.message === 'REQUEST_TIMEOUT' ? 'REQUEST_TIMEOUT' : 'NETWORK_FAILED'
      });
    });
    if (body) request.write(body);
    request.end();
  });
}

function proxyAuthHeader(proxyUrl) {
  if (!proxyUrl.username && !proxyUrl.password) return null;
  const username = decodeURIComponent(proxyUrl.username || '');
  const password = decodeURIComponent(proxyUrl.password || '');
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function requestHttpsViaProxy(targetUrl, proxyUrl, options, timeoutMs) {
  const targetPort = targetUrl.port || 443;
  const body = options.body || '';

  return new Promise((resolve) => {
    const proxyPort = Number(proxyUrl.port || 80);
    const socket = net.connect(proxyPort, proxyUrl.hostname);
    let settled = false;
    let connectBuffer = Buffer.alloc(0);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish({ status: 0, contentType: '', text: '', error_code: 'REQUEST_TIMEOUT' }));
    socket.on('error', () => finish({ status: 0, contentType: '', text: '', error_code: 'NETWORK_FAILED' }));
    socket.on('connect', () => {
      const auth = proxyAuthHeader(proxyUrl);
      const headers = [
        `CONNECT ${targetUrl.hostname}:${targetPort} HTTP/1.1`,
        `Host: ${targetUrl.hostname}:${targetPort}`,
        'Connection: close'
      ];
      if (auth) headers.push(`Proxy-Authorization: ${auth}`);
      socket.write(`${headers.join('\r\n')}\r\n\r\n`);
    });

    socket.on('data', (chunk) => {
      connectBuffer = Buffer.concat([connectBuffer, Buffer.from(chunk)]);
      const headerEnd = connectBuffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const headerText = connectBuffer.slice(0, headerEnd).toString('latin1');
      if (!/^HTTP\/1\.[01] 200\b/.test(headerText)) {
        finish({ status: 0, contentType: '', text: '', error_code: 'PROXY_CONNECT_FAILED' });
        return;
      }

      socket.removeAllListeners('data');
      socket.removeAllListeners('timeout');
      socket.removeAllListeners('error');

      const secureSocket = tls.connect({
        socket,
        servername: targetUrl.hostname
      });
      const responseChunks = [];
      const method = options.method || 'GET';
      const path = `${targetUrl.pathname}${targetUrl.search}`;
      const headers = {
        host: targetUrl.host,
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'accept-encoding': 'identity',
        'user-agent': 'Palmmi-Stage6H-Preflight/1.0',
        connection: 'close',
        ...(options.headers || {})
      };
      if (body) {
        headers['content-length'] = Buffer.byteLength(body);
      }

      secureSocket.setTimeout(timeoutMs);
      secureSocket.on('secureConnect', () => {
        const headerLines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
        secureSocket.write(`${method} ${path} HTTP/1.1\r\n${headerLines.join('\r\n')}\r\n\r\n${body}`);
      });
      secureSocket.on('data', (data) => responseChunks.push(Buffer.from(data)));
      secureSocket.on('end', () => {
        const parsed = parseRawHttpResponse(Buffer.concat(responseChunks));
        if (!settled) {
          settled = true;
          resolve(parsed);
        }
      });
      secureSocket.on('timeout', () => finish({ status: 0, contentType: '', text: '', error_code: 'REQUEST_TIMEOUT' }));
      secureSocket.on('error', () => finish({ status: 0, contentType: '', text: '', error_code: 'NETWORK_FAILED' }));
    });
  });
}

async function requestTextViaNode(url, options, timeoutMs) {
  const targetUrl = new URL(url);
  const proxyUrl = getProxyForUrl(targetUrl);
  if (proxyUrl && targetUrl.protocol === 'https:') {
    return requestHttpsViaProxy(targetUrl, proxyUrl, options, timeoutMs);
  }
  return requestDirect(targetUrl, options, timeoutMs);
}

async function requestText({ fetchImpl, requestImpl, url, options, timeoutMs }) {
  if (requestImpl) {
    return requestImpl(url, options, timeoutMs);
  }
  if (fetchImpl) {
    return fetchText(fetchImpl, url, options, timeoutMs);
  }
  return requestTextViaNode(url, options, timeoutMs);
}

async function requestTextWithRetry({ fetchImpl, requestImpl, url, options, timeoutMs, maxAttempts }) {
  let lastResult = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResult = await requestText({ fetchImpl, requestImpl, url, options, timeoutMs });
    if (lastResult.status !== 0) {
      return {
        ...lastResult,
        attempts: attempt
      };
    }
  }
  return {
    ...(lastResult || { status: 0, contentType: '', text: '', error_code: 'NETWORK_FAILED' }),
    attempts: maxAttempts
  };
}

function getApiErrorCode(text) {
  try {
    const json = JSON.parse(text);
    return json && json.error && typeof json.error.code === 'string'
      ? json.error.code
      : null;
  } catch (_error) {
    return null;
  }
}

function parseBuildMeta(text) {
  try {
    const json = JSON.parse(text);
    return json && typeof json === 'object' ? json : null;
  } catch (_error) {
    return null;
  }
}

async function runPreflight({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = null,
  requestImpl = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  expectedCommitSha = null
} = {}) {
  const normalizedBaseUrl = String(baseUrl).replace(/\/+$/, '');
  const pages = [];

  for (const path of PAGE_PATHS) {
    const response = await requestTextWithRetry({
      fetchImpl,
      requestImpl,
      url: `${normalizedBaseUrl}${path}`,
      options: { method: 'GET' },
      timeoutMs,
      maxAttempts
    });
    const text = response.text || '';
    pages.push({
      path,
      http_status: response.status,
      ok: response.status === 200,
      palmmi: /Palmmi|掌纹人格标签/.test(text),
      hello_world: /Hello World/i.test(text),
      bytes: Buffer.byteLength(text),
      content_type: response.contentType,
      attempts: response.attempts,
      has_api_key: hasApiKeyMarker(text),
      has_base64: hasBase64Marker(text),
      has_stack: hasStackMarker(text),
      has_raw_response: hasRawResponseMarker(text),
      error_code: response.error_code || null
    });
  }

  const apiResponse = await requestTextWithRetry({
    fetchImpl,
    requestImpl,
    url: `${normalizedBaseUrl}/api/analyze`,
    options: {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'not an image'
    },
    timeoutMs,
    maxAttempts
  });
  const apiText = apiResponse.text || '';
  const apiInvalidPost = {
    path: '/api/analyze',
    http_status: apiResponse.status,
    ok: apiResponse.status >= 400 && apiResponse.status < 500,
    error_code: getApiErrorCode(apiText) || apiResponse.error_code || null,
    bytes: Buffer.byteLength(apiText),
    content_type: apiResponse.contentType,
    attempts: apiResponse.attempts,
    has_api_key: hasApiKeyMarker(apiText),
    has_base64: hasBase64Marker(apiText),
    has_stack: hasStackMarker(apiText),
    has_raw_response: hasRawResponseMarker(apiText)
  };

  const metaResponse = await requestTextWithRetry({
    fetchImpl,
    requestImpl,
    url: `${normalizedBaseUrl}/build-meta.json`,
    options: { method: 'GET' },
    timeoutMs,
    maxAttempts
  });
  const metaText = metaResponse.text || '';
  const parsedMeta = parseBuildMeta(metaText);
  const commitSha = parsedMeta && typeof parsedMeta.commit_sha === 'string' ? parsedMeta.commit_sha : null;
  const buildMeta = {
    path: '/build-meta.json',
    http_status: metaResponse.status,
    available: metaResponse.status === 200 && Boolean(parsedMeta),
    commit_sha: commitSha,
    branch: parsedMeta && typeof parsedMeta.branch === 'string' ? parsedMeta.branch : null,
    expected_commit_sha: expectedCommitSha || null,
    matches_expected_commit: expectedCommitSha ? commitSha === expectedCommitSha : null,
    attempts: metaResponse.attempts,
    has_api_key: hasApiKeyMarker(metaText),
    has_base64: hasBase64Marker(metaText),
    has_stack: hasStackMarker(metaText),
    has_raw_response: hasRawResponseMarker(metaText)
  };

  const pageOk = pages.every((page) => (
    page.ok
    && page.palmmi
    && !page.hello_world
    && !page.has_api_key
    && !page.has_base64
    && !page.has_stack
    && !page.has_raw_response
  ));
  const apiOk = (
    apiInvalidPost.ok
    && !apiInvalidPost.has_api_key
    && !apiInvalidPost.has_base64
    && !apiInvalidPost.has_stack
    && !apiInvalidPost.has_raw_response
  );
  const buildMetaOk = (
    !buildMeta.has_api_key
    && !buildMeta.has_base64
    && !buildMeta.has_stack
    && !buildMeta.has_raw_response
    && (!expectedCommitSha || buildMeta.matches_expected_commit === true)
  );

  return {
    ok: pageOk && apiOk && buildMetaOk,
    stage: '6H',
    base_url: normalizedBaseUrl,
    pages,
    api_invalid_post: apiInvalidPost,
    build_meta: buildMeta,
    api_calls_made: 0,
    quota_consumed: false,
    real_qwen_called: false,
    safety: {
      printed_key: false,
      printed_base64: false,
      printed_raw_response: false
    },
    note: 'This preflight only uses page GET requests and an invalid text/plain API POST. It does not upload a real image.'
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await runPreflight(options);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  runPreflight,
  parseArgs,
  hasApiKeyMarker,
  hasBase64Marker,
  hasStackMarker,
  hasRawResponseMarker,
  requestTextViaNode
};
