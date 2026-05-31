#!/usr/bin/env node

const fs = require('node:fs');

const DEVICE_NAMES = ['iPhone Safari', 'iPhone 微信', 'Android Chrome', 'Android 微信'];
const REQUIRED_FIELDS = [
  '首页 / 上传页是否打开',
  '相册上传清晰掌心是否成功',
  '拍照上传是否成功',
  '结果页是否显示',
  '海报页是否显示',
  '是否能保存海报',
  '非手掌图片是否被拒绝',
  '模糊 / 偏暗图片提示是否可读',
  '是否白屏 / 卡死 / 无限加载',
  '是否看到 key、base64、英文堆栈或 raw response'
];

const MINIMUM_WECHAT_FIELDS = [
  '首页 / 上传页是否打开',
  '相册上传清晰掌心是否成功',
  '结果页是否显示',
  '海报页是否显示',
  '是否白屏 / 卡死 / 无限加载',
  '是否看到 key、base64、英文堆栈或 raw response'
];

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function normalizeKey(value) {
  return normalizeText(value)
    .replace(/[：:]/g, '')
    .replace(/`/g, '')
    .replace(/\/build-meta\.json/g, 'buildmeta');
}

function isMissing(value) {
  const normalized = normalizeText(value);
  return !normalized || /待填|待测|未测|未知|unknown|tbd|n\/a/.test(normalized);
}

function isNegative(value) {
  const normalized = normalizeText(value);
  return /否|不|失败|不能|不可|打不开|没有成功|异常|白屏|卡死|无限|看到|泄露|base64|raw|stack|key/.test(normalized);
}

function isSafeNegative(value) {
  const normalized = normalizeText(value);
  return /^(否|无|没有|未看到|没看到|no|none|pass|ok|正常)$/.test(normalized)
    || /没有.*(白屏|卡死|无限|key|base64|堆栈|raw|response|泄露)/.test(normalized)
    || /未看到.*(key|base64|堆栈|raw|response|泄露)/.test(normalized);
}

function isPositive(value) {
  const normalized = normalizeText(value);
  return !isMissing(value) && !isNegative(value) && /是|成功|正常|可以|可|能|已确认|pass|ok|success/.test(normalized);
}

function getField(fields, expectedField) {
  const expected = normalizeKey(expectedField);
  for (const [key, value] of Object.entries(fields)) {
    if (normalizeKey(key) === expected) {
      return value;
    }
  }
  return '';
}

function extractDeploymentConfirmed(text) {
  const deploymentBlock = text.split(/\n(?=iPhone Safari[：:]|iPhone 微信[：:]|Android Chrome[：:]|Android 微信[：:])/i)[0] || '';
  if (/build-meta|\/build-meta\.json/i.test(deploymentBlock) && /(是|已确认|匹配|pass|success|true)/i.test(deploymentBlock)) {
    return true;
  }
  if (/部署状态是否\s*success[：:]\s*(是|yes|success|pass)/i.test(deploymentBlock)) {
    return true;
  }
  return false;
}

function parseDevices(text) {
  const devices = {};
  const sectionPattern = /(iPhone Safari|iPhone 微信|Android Chrome|Android 微信)[：:]\s*([\s\S]*?)(?=\n(?:iPhone Safari|iPhone 微信|Android Chrome|Android 微信|真实清晰掌纹分析次数|其他问题)[：:]|$)/g;
  let match = sectionPattern.exec(text);

  while (match) {
    const fields = {};
    for (const line of match[2].split(/\r?\n/)) {
      const fieldMatch = line.match(/^\s*[-*]\s*(.+?)[：:]\s*(.*?)\s*$/);
      if (fieldMatch) {
        fields[fieldMatch[1].trim()] = fieldMatch[2].trim();
      }
    }
    devices[match[1]] = fields;
    match = sectionPattern.exec(text);
  }

  return devices;
}

function evaluateDevice(deviceName, fields, present) {
  const missing = [];
  const blockers = [];

  for (const field of REQUIRED_FIELDS) {
    const value = getField(fields, field);
    if (isMissing(value)) {
      missing.push({ device: deviceName, field, value: value || null });
    }
  }

  for (const field of [
    '首页 / 上传页是否打开',
    '相册上传清晰掌心是否成功',
    '拍照上传是否成功',
    '结果页是否显示',
    '海报页是否显示'
  ]) {
    const value = getField(fields, field);
    if (!isMissing(value) && !isPositive(value)) {
      blockers.push({ device: deviceName, field, value, code: 'CORE_FLOW_FAILED' });
    }
  }

  const whiteScreen = getField(fields, '是否白屏 / 卡死 / 无限加载');
  if (!isMissing(whiteScreen) && !isSafeNegative(whiteScreen)) {
    blockers.push({ device: deviceName, field: '是否白屏 / 卡死 / 无限加载', value: whiteScreen, code: 'WHITE_SCREEN_OR_HANG' });
  }

  const leak = getField(fields, '是否看到 key、base64、英文堆栈或 raw response');
  if (!isMissing(leak) && !isSafeNegative(leak)) {
    blockers.push({ device: deviceName, field: '是否看到 key、base64、英文堆栈或 raw response', value: leak, code: 'SENSITIVE_LEAK' });
  }

  return {
    device: deviceName,
    present: Boolean(present),
    missing,
    blockers,
    required_complete: missing.length === 0,
    no_severe_blocker: blockers.length === 0
  };
}

function hasMinimumWechatPass(device) {
  if (!device || !device.present || !device.no_severe_blocker) {
    return false;
  }
  return MINIMUM_WECHAT_FIELDS.every((field) => {
    const value = getField(device.fields || {}, field);
    if (field === '是否白屏 / 卡死 / 无限加载' || field === '是否看到 key、base64、英文堆栈或 raw response') {
      return !isMissing(value) && isSafeNegative(value);
    }
    return isPositive(value);
  });
}

function evaluateManualResult(text) {
  const sourceText = String(text || '');
  const parsedDevices = parseDevices(sourceText);
  const missingRequired = [];
  const severeBlockers = [];
  const devices = {};

  for (const deviceName of DEVICE_NAMES) {
    const present = Object.prototype.hasOwnProperty.call(parsedDevices, deviceName);
    const fields = parsedDevices[deviceName] || {};
    const result = evaluateDevice(deviceName, fields, present);
    result.fields = fields;
    devices[deviceName] = result;
    missingRequired.push(...result.missing);
    severeBlockers.push(...result.blockers);
  }

  const deploymentConfirmed = extractDeploymentConfirmed(sourceText);
  const minimumWechatPass = hasMinimumWechatPass(devices['iPhone 微信']) && hasMinimumWechatPass(devices['Android 微信']);
  const canEnterStage6i = deploymentConfirmed
    && DEVICE_NAMES.every((deviceName) => devices[deviceName].required_complete && devices[deviceName].no_severe_blocker);
  const stage6hMinimumConditionalPass = deploymentConfirmed && minimumWechatPass && severeBlockers.length === 0;

  return {
    ok: canEnterStage6i,
    stage: '6H',
    deployment_confirmed: deploymentConfirmed,
    can_enter_stage6i: canEnterStage6i,
    stage6h_minimum_conditional_pass: stage6hMinimumConditionalPass,
    devices,
    missing_required: missingRequired,
    severe_blockers: severeBlockers,
    api_calls_made: 0,
    quota_consumed: false,
    real_qwen_called: false,
    note: 'This checker reads pasted manual true-device results only. It does not upload images, call Qwen, or verify true-device claims by itself.'
  };
}

function parseArgs(argv) {
  const options = { file: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--file') {
      options.file = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function readStdin() {
  return fs.readFileSync(0, 'utf8');
}

function printHelp() {
  console.log(`Usage: node scripts/stage6h/manual-result-check.cjs [--file PATH]

Reads Stage 6H manual true-device result text and outputs a JSON gate summary.
It does not upload images, call Qwen, or consume quota.`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const text = options.file ? fs.readFileSync(options.file, 'utf8') : readStdin();
  const result = evaluateManualResult(text);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  }
}

module.exports = {
  evaluateManualResult,
  parseDevices,
  parseArgs
};
