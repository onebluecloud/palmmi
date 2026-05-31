const assert = require('node:assert/strict');

let loadError = null;
let precheck = null;

try {
  precheck = require('../../scripts/stage6i/release-candidate-precheck.cjs');
} catch (error) {
  loadError = error;
}

assert.equal(loadError, null, `Stage 6I precheck module should load: ${loadError && loadError.message}`);

const {
  buildStage6iCommands,
  runStage6iPrecheck,
  redactCommandOutput,
  parseArgs,
  spawnCommand
} = precheck;

assert.equal(typeof buildStage6iCommands, 'function');
assert.equal(typeof runStage6iPrecheck, 'function');
assert.equal(typeof redactCommandOutput, 'function');
assert.equal(typeof parseArgs, 'function');
assert.equal(typeof spawnCommand, 'function');

function commandText(command) {
  return [command.bin, ...command.args].join(' ');
}

async function main() {
  const commands = buildStage6iCommands({
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    manualResultFile: 'C:\\temp\\stage6h-result.txt'
  });

  assert.deepEqual(commands.map((command) => command.name), [
    'npm test',
    'npm run build',
    'npm run security-scan',
    'npm run smoke:stage6f:qwen',
    'npm run preflight:stage6h',
    'npm run check:stage6h:manual'
  ]);

  const allCommandText = commands.map(commandText).join('\n');
  assert.equal(/test:stage6f:real|e2e:real-qwen|--real\b|PALMMI_ALLOW_REAL_QWEN_TESTS=1/i.test(allCommandText), false);
  assert.ok(allCommandText.includes('--expect-commit abcdef1234567890abcdef1234567890abcdef12'));
  assert.ok(allCommandText.includes('--file C:\\temp\\stage6h-result.txt'));

  const executed = [];
  const result = await runStage6iPrecheck({
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    manualResultFile: 'C:\\temp\\stage6h-result.txt',
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    runCommand: async (command) => {
      executed.push(command.name);
      if (command.name === 'npm run security-scan') {
        return {
          status: 0,
          stdout: JSON.stringify({ finding_count: 0, no_key_or_token_leak: true }),
          stderr: ''
        };
      }
      if (command.name === 'npm run smoke:stage6f:qwen') {
        return {
          status: 0,
          stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, status: 'REAL_QWEN_DISABLED' }),
          stderr: ''
        };
      }
      if (command.name === 'npm run preflight:stage6h') {
        return {
          status: 0,
          stdout: JSON.stringify({
            api_calls_made: 0,
            quota_consumed: false,
            real_qwen_called: false,
            build_meta: { matches_expected_commit: true }
          }),
          stderr: ''
        };
      }
      if (command.name === 'npm run check:stage6h:manual') {
        return {
          status: 0,
          stdout: JSON.stringify({
            can_enter_stage6i: true,
            stage6h_minimum_conditional_pass: true,
            all_manual_required_complete: false,
            api_calls_made: 0,
            quota_consumed: false,
            real_qwen_called: false
          }),
          stderr: ''
        };
      }
      return {
        status: 0,
        stdout: 'ok with accidental secret sk-test-1234567890abcdef',
        stderr: ''
      };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.stage, '6I');
  assert.equal(result.precheck_ok, true);
  assert.equal(result.can_enter_stage6i, true);
  assert.equal(result.api_calls_made, 0);
  assert.equal(result.quota_consumed, false);
  assert.equal(result.real_qwen_called, false);
  assert.deepEqual(executed, commands.map((command) => command.name));
  assert.equal(JSON.stringify(result).includes('sk-test-1234567890abcdef'), false);
  assert.ok(JSON.stringify(result).includes('[REDACTED_SECRET]'));

  const withoutManual = await runStage6iPrecheck({
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    runCommand: async (command) => ({
      status: 0,
      stdout: command.name === 'npm run smoke:stage6f:qwen'
        ? JSON.stringify({ api_calls_made: 0, quota_consumed: false })
        : JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
      stderr: ''
    })
  });

  assert.equal(withoutManual.precheck_ok, true);
  assert.equal(withoutManual.ok, false);
  assert.equal(withoutManual.can_enter_stage6i, false);
  assert.equal(withoutManual.can_continue_development, false);
  assert.equal(withoutManual.manual_result.status, 'SKIPPED_NO_MANUAL_RESULT_FILE');

  const deferredManual = await runStage6iPrecheck({
    deferManualResult: true,
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    runCommand: async (command) => {
      if (command.name === 'npm run security-scan') {
        return {
          status: 0,
          stdout: JSON.stringify({ finding_count: 0, no_key_or_token_leak: true }),
          stderr: ''
        };
      }
      if (command.name === 'npm run smoke:stage6f:qwen') {
        return {
          status: 0,
          stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, status: 'REAL_QWEN_DISABLED' }),
          stderr: ''
        };
      }
      if (command.name === 'npm run preflight:stage6h') {
        return {
          status: 0,
          stdout: JSON.stringify({
            ok: true,
            api_calls_made: 0,
            quota_consumed: false,
            real_qwen_called: false,
            build_meta: { matches_expected_commit: true }
          }),
          stderr: ''
        };
      }
      return {
        status: 0,
        stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
        stderr: ''
      };
    }
  });

  assert.equal(deferredManual.precheck_ok, true);
  assert.equal(deferredManual.ok, true);
  assert.equal(deferredManual.formal_gate_ok, false);
  assert.equal(deferredManual.can_enter_stage6i, false);
  assert.equal(deferredManual.can_continue_development, true);
  assert.equal(deferredManual.manual_result_deferred, true);
  assert.equal(deferredManual.stage6i_status, 'READY_FOR_DEVELOPMENT_MANUAL_DEFERRED');
  assert.equal(deferredManual.api_calls_made, 0);
  assert.equal(deferredManual.quota_consumed, false);
  assert.equal(deferredManual.real_qwen_called, false);

  const automatedFailure = await runStage6iPrecheck({
    deferManualResult: true,
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    runCommand: async (command) => {
      if (command.name === 'npm run build') {
        return {
          status: 1,
          stdout: '',
          stderr: 'Build failed before deployment output.'
        };
      }
      return {
        status: 0,
        stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
        stderr: ''
      };
    }
  });

  assert.equal(automatedFailure.precheck_ok, false);
  assert.equal(automatedFailure.ok, false);
  assert.equal(automatedFailure.stage6i_status, 'AUTOMATED_PRECHECK_FAILED');
  assert.equal(automatedFailure.error_code, 'STAGE6I_AUTOMATED_PRECHECK_FAILED');
  assert.equal(automatedFailure.command_failure_count, 1);
  assert.equal(automatedFailure.can_continue_development, false);
  assert.equal(automatedFailure.api_calls_made, 0);
  assert.equal(automatedFailure.quota_consumed, false);
  assert.equal(automatedFailure.real_qwen_called, false);

  let preflightAttempts = 0;
  const retryingPreflight = await runStage6iPrecheck({
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    retryDelayMs: 0,
    runCommand: async (command) => {
      if (command.name === 'npm run security-scan') {
        return {
          status: 0,
          stdout: JSON.stringify({ finding_count: 0, no_key_or_token_leak: true }),
          stderr: ''
        };
      }
      if (command.name === 'npm run smoke:stage6f:qwen') {
        return {
          status: 0,
          stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, status: 'REAL_QWEN_DISABLED' }),
          stderr: ''
        };
      }
      if (command.name === 'npm run preflight:stage6h') {
        preflightAttempts += 1;
        return preflightAttempts === 1
          ? {
              status: 1,
              stdout: JSON.stringify({
                ok: false,
                api_calls_made: 0,
                quota_consumed: false,
                real_qwen_called: false,
                build_meta: { matches_expected_commit: false }
              }),
              stderr: ''
            }
          : {
              status: 0,
              stdout: JSON.stringify({
                ok: true,
                api_calls_made: 0,
                quota_consumed: false,
                real_qwen_called: false,
                build_meta: { matches_expected_commit: true }
              }),
              stderr: ''
            };
      }
      return {
        status: 0,
        stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
        stderr: ''
      };
    }
  });

  assert.equal(retryingPreflight.precheck_ok, true);
  assert.equal(retryingPreflight.api_calls_made, 0);
  assert.equal(preflightAttempts, 2);
  assert.equal(retryingPreflight.commands.find((command) => command.name === 'npm run preflight:stage6h').attempts, 2);

  let npmTestAttempts = 0;
  const retryingNpmTestNetworkFailure = await runStage6iPrecheck({
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    retryDelayMs: 0,
    runCommand: async (command) => {
      if (command.name === 'npm test') {
        npmTestAttempts += 1;
        return npmTestAttempts === 1
          ? {
              status: 1,
              stdout: '',
              stderr: 'page.goto: net::ERR_CONNECTION_CLOSED at https://palmmi.pages.dev/'
            }
          : {
              status: 0,
              stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
              stderr: ''
            };
      }
      if (command.name === 'npm run security-scan') {
        return {
          status: 0,
          stdout: JSON.stringify({ finding_count: 0, no_key_or_token_leak: true }),
          stderr: ''
        };
      }
      if (command.name === 'npm run smoke:stage6f:qwen') {
        return {
          status: 0,
          stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, status: 'REAL_QWEN_DISABLED' }),
          stderr: ''
        };
      }
      if (command.name === 'npm run preflight:stage6h') {
        return {
          status: 0,
          stdout: JSON.stringify({
            ok: true,
            api_calls_made: 0,
            quota_consumed: false,
            real_qwen_called: false,
            build_meta: { matches_expected_commit: true }
          }),
          stderr: ''
        };
      }
      return {
        status: 0,
        stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
        stderr: ''
      };
    }
  });

  assert.equal(retryingNpmTestNetworkFailure.precheck_ok, true);
  assert.equal(retryingNpmTestNetworkFailure.api_calls_made, 0);
  assert.equal(npmTestAttempts, 2);
  assert.equal(retryingNpmTestNetworkFailure.commands.find((command) => command.name === 'npm test').attempts, 2);

  let npmTestTransportEofAttempts = 0;
  const retryingNpmTestTransportEof = await runStage6iPrecheck({
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    retryDelayMs: 0,
    runCommand: async (command) => {
      if (command.name === 'npm test') {
        npmTestTransportEofAttempts += 1;
        return npmTestTransportEofAttempts === 1
          ? {
              status: 1,
              stdout: '',
              stderr: 'Invoke-WebRequest: Received an unexpected EOF or 0 bytes from the transport stream.'
            }
          : {
              status: 0,
              stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
              stderr: ''
            };
      }
      if (command.name === 'npm run security-scan') {
        return {
          status: 0,
          stdout: JSON.stringify({ finding_count: 0, no_key_or_token_leak: true }),
          stderr: ''
        };
      }
      if (command.name === 'npm run smoke:stage6f:qwen') {
        return {
          status: 0,
          stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, status: 'REAL_QWEN_DISABLED' }),
          stderr: ''
        };
      }
      if (command.name === 'npm run preflight:stage6h') {
        return {
          status: 0,
          stdout: JSON.stringify({
            ok: true,
            api_calls_made: 0,
            quota_consumed: false,
            real_qwen_called: false,
            build_meta: { matches_expected_commit: true }
          }),
          stderr: ''
        };
      }
      return {
        status: 0,
        stdout: JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
        stderr: ''
      };
    }
  });

  assert.equal(retryingNpmTestTransportEof.precheck_ok, true);
  assert.equal(retryingNpmTestTransportEof.api_calls_made, 0);
  assert.equal(npmTestTransportEofAttempts, 2);
  assert.equal(retryingNpmTestTransportEof.commands.find((command) => command.name === 'npm test').attempts, 2);

  const formalWithInsufficientManual = await runStage6iPrecheck({
    requireManualResult: true,
    expectedCommitSha: 'abcdef1234567890abcdef1234567890abcdef12',
    manualResultFile: 'C:\\temp\\stage6h-result.txt',
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    runCommand: async (command) => {
      if (command.name === 'npm run check:stage6h:manual') {
        return {
          status: 0,
          stdout: JSON.stringify({
            can_enter_stage6i: false,
            stage6h_minimum_conditional_pass: false,
            api_calls_made: 0,
            quota_consumed: false,
            real_qwen_called: false
          }),
          stderr: ''
        };
      }
      return {
        status: 0,
        stdout: command.name === 'npm run smoke:stage6f:qwen'
          ? JSON.stringify({ api_calls_made: 0, quota_consumed: false })
          : JSON.stringify({ api_calls_made: 0, quota_consumed: false, real_qwen_called: false }),
        stderr: ''
      };
    }
  });

  assert.equal(formalWithInsufficientManual.precheck_ok, true);
  assert.equal(formalWithInsufficientManual.ok, false);
  assert.equal(formalWithInsufficientManual.formal_gate_ok, false);
  assert.equal(formalWithInsufficientManual.error_code, 'STAGE6I_MANUAL_RESULT_NOT_READY');
  assert.equal(formalWithInsufficientManual.manual_result_required, true);
  assert.equal(formalWithInsufficientManual.api_calls_made, 0);
  assert.equal(formalWithInsufficientManual.quota_consumed, false);

  let failFastCommandRan = false;
  const failFast = await runStage6iPrecheck({
    requireManualResult: true,
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    runCommand: async () => {
      failFastCommandRan = true;
      throw new Error('formal gate without manual file should fail before child commands');
    }
  });

  assert.equal(failFast.precheck_ok, false);
  assert.equal(failFast.ok, false);
  assert.equal(failFast.formal_gate_ok, false);
  assert.equal(failFast.error_code, 'STAGE6I_MANUAL_RESULT_FILE_MISSING');
  assert.deepEqual(failFast.commands, []);
  assert.equal(failFastCommandRan, false);
  assert.equal(failFast.api_calls_made, 0);
  assert.equal(failFast.quota_consumed, false);

  let missingCommitCommandRan = false;
  const missingCommit = await runStage6iPrecheck({
    requireManualResult: true,
    manualResultFile: 'C:\\temp\\stage6h-result.txt',
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '0' },
    runCommand: async () => {
      missingCommitCommandRan = true;
      throw new Error('formal gate without expected commit should fail before child commands');
    }
  });

  assert.equal(missingCommit.precheck_ok, false);
  assert.equal(missingCommit.ok, false);
  assert.equal(missingCommit.formal_gate_ok, false);
  assert.equal(missingCommit.error_code, 'STAGE6I_EXPECTED_COMMIT_REQUIRED');
  assert.deepEqual(missingCommit.commands, []);
  assert.equal(missingCommitCommandRan, false);
  assert.equal(missingCommit.api_calls_made, 0);
  assert.equal(missingCommit.quota_consumed, false);

  const guarded = await runStage6iPrecheck({
    env: { PALMMI_ALLOW_REAL_QWEN_TESTS: '1' },
    runCommand: async () => {
      throw new Error('must not execute when real Qwen env is enabled');
    }
  });

  assert.equal(guarded.ok, false);
  assert.equal(guarded.precheck_ok, false);
  assert.equal(guarded.error_code, 'STAGE6I_REAL_QWEN_ENV_GUARD');
  assert.equal(guarded.api_calls_made, 0);
  assert.equal(guarded.quota_consumed, false);

  assert.equal(redactCommandOutput('api_key=sk-test-1234567890abcdef data:image/png;base64,AAAA raw response={"secret":"x"}').includes('sk-test'), false);
  assert.equal(parseArgs(['--expect-commit', 'abc', '--manual-result-file', 'result.txt', '--require-manual-result']).requireManualResult, true);
  assert.equal(parseArgs(['--defer-manual-result']).deferManualResult, true);

  const npmVersion = await spawnCommand({
    name: 'npm --version',
    bin: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['--version']
  });
  assert.equal(npmVersion.status, 0, npmVersion.stderr || npmVersion.stdout);
  assert.match(npmVersion.stdout.trim(), /^\d+\.\d+\.\d+/);

  console.log('Stage 6I release candidate precheck tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
