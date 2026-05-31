const assert = require('node:assert/strict');

const { evaluateManualResult } = require('../../scripts/stage6h/manual-result-check.cjs');

const DEPLOYMENT_OK = `线上部署确认：
- Codex 是否已确认 /build-meta.json 匹配最终报告中的最新 commit：是
- 如果 Codex 无法确认，Cloudflare Dashboard 部署状态是否 Success：不用，Codex 已确认`;

function deviceBlock(name, overrides = {}) {
  const fields = {
    '首页 / 上传页是否打开': '是',
    '相册上传清晰掌心是否成功': '是',
    '拍照上传是否成功': '是',
    '结果页是否显示': '是',
    '海报页是否显示': '是',
    '是否能保存海报': '是',
    '非手掌图片是否被拒绝': '是',
    '模糊 / 偏暗图片提示是否可读': '是',
    '是否白屏 / 卡死 / 无限加载': '否',
    '是否看到 key、base64、英文堆栈或 raw response': '否',
    ...overrides
  };

  return `${name}：\n${Object.entries(fields).map(([key, value]) => `- ${key}：${value}`).join('\n')}`;
}

function fullReport(overridesByDevice = {}) {
  return [
    DEPLOYMENT_OK,
    deviceBlock('iPhone Safari', overridesByDevice['iPhone Safari']),
    deviceBlock('iPhone 微信', overridesByDevice['iPhone 微信']),
    deviceBlock('Android Chrome', overridesByDevice['Android Chrome']),
    deviceBlock('Android 微信', overridesByDevice['Android 微信']),
    `真实清晰掌纹分析次数：
- 大约调用次数：4
- 是否接受这次额度消耗：是`
  ].join('\n\n');
}

function main() {
  const pass = evaluateManualResult(fullReport());
  assert.equal(pass.ok, true);
  assert.equal(pass.can_enter_stage6i, true);
  assert.equal(pass.stage6h_minimum_conditional_pass, true);
  assert.equal(pass.api_calls_made, 0);
  assert.equal(pass.quota_consumed, false);
  assert.deepEqual(pass.severe_blockers, []);
  assert.deepEqual(pass.missing_required, []);

  const wechatOnly = evaluateManualResult([
    DEPLOYMENT_OK,
    deviceBlock('iPhone Safari', { '相册上传清晰掌心是否成功': '待填' }),
    deviceBlock('iPhone 微信'),
    deviceBlock('Android Chrome', { '相册上传清晰掌心是否成功': '待填' }),
    deviceBlock('Android 微信')
  ].join('\n\n'));
  assert.equal(wechatOnly.ok, true);
  assert.equal(wechatOnly.can_enter_stage6i, true);
  assert.equal(wechatOnly.stage6h_minimum_conditional_pass, true);
  assert.equal(wechatOnly.all_manual_required_complete, false);
  assert.ok(wechatOnly.missing_required.some((item) => item.device === 'iPhone Safari'));
  assert.ok(wechatOnly.missing_required.some((item) => item.device === 'Android Chrome'));

  const rawSensitiveObservation = '看到 api_key=sk-test-1234567890abcdef data:image/png;base64,AAAAABBBBBCCCCCDDDDDEEEEEFFFFFGGGGGHHHHHIIIIIJJJJJ raw response={"provider":"qwen","secret":"do-not-print"}';
  const leak = evaluateManualResult(fullReport({
    'Android 微信': {
      '是否看到 key、base64、英文堆栈或 raw response': rawSensitiveObservation
    }
  }));
  assert.equal(leak.ok, false);
  assert.equal(leak.can_enter_stage6i, false);
  assert.equal(leak.stage6h_minimum_conditional_pass, false);
  assert.ok(leak.severe_blockers.some((item) => item.device === 'Android 微信' && item.code === 'SENSITIVE_LEAK'));
  const serializedLeak = JSON.stringify(leak);
  assert.equal(serializedLeak.includes('sk-test-1234567890abcdef'), false);
  assert.equal(serializedLeak.includes('data:image/png;base64'), false);
  assert.equal(serializedLeak.includes('do-not-print'), false);
  assert.ok(serializedLeak.includes('[REDACTED_SECRET]'));
  assert.ok(serializedLeak.includes('[REDACTED_BASE64_IMAGE]'));
  assert.ok(serializedLeak.includes('[REDACTED_RAW_RESPONSE]'));

  const blank = evaluateManualResult(`iPhone 微信：\n- 首页 / 上传页是否打开：待填`);
  assert.equal(blank.ok, false);
  assert.equal(blank.deployment_confirmed, false);
  assert.equal(blank.devices['Android 微信'].present, false);
  assert.ok(blank.missing_required.length > 0);
  assert.equal(blank.api_calls_made, 0);
  assert.equal(blank.real_qwen_called, false);

  console.log('Stage 6H manual result check tests passed.');
}

main();
