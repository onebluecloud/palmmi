#!/usr/bin/env node

const { spawn } = require('node:child_process');

function npmBin() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function redactCommandOutput(value) {
  return String(value || '')
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=_-]+/gi, '[REDACTED_BASE64_IMAGE]')
    .replace(/\bsk-[a-z0-9_-]{8,}\b/gi, '[REDACTED_SECRET]')
    .replace(/\b(api[_-]?key|token|secret|authorization)\s*[:=]\s*['"]?[^\s'",;{}]+/gi, '$1=[REDACTED_SECRET]')
    .replace(/raw\s*response\s*[:=]\s*.+$/gim, 'raw response=[REDACTED_RAW_RESPONSE]')
    .replace(/\b[a-z0-9+/]{160,}={0,2}\b/gi, '[REDACTED_LONG_PAYLOAD]');
}

function buildStage6iCommands(options = {}) {
  const npm = npmBin();
  const commands = [
    { name: 'npm test', bin: npm, args: ['test'] },
    { name: 'npm run build', bin: npm, args: ['run', 'build'] },
    { name: 'npm run security-scan', bin: npm, args: ['run', 'security-scan'] },
    { name: 'npm run smoke:stage6f:qwen', bin: npm, args: ['run', 'smoke:stage6f:qwen'] }
  ];

  const preflightArgs = ['run', 'preflight:stage6h'];
  if (options.expectedCommitSha) {
    preflightArgs.push('--', '--expect-commit', options.expectedCommitSha);
  }
  commands.push({ name: 'npm run preflight:stage6h', bin: npm, args: preflightArgs });

  if (options.manualResultFile) {
    commands.push({
      name: 'npm run check:stage6h:manual',
      bin: npm,
      args: ['run', 'check:stage6h:manual', '--', '--file', options.manualResultFile]
    });
  }

  return commands;
}

function extractNumbers(output, key) {
  const pattern = new RegExp(`"${key}"\\s*:\\s*(\\d+)`, 'gi');
  const values = [];
  let match = pattern.exec(output);
  while (match) {
    values.push(Number(match[1]));
    match = pattern.exec(output);
  }
  return values;
}

function extractBoolean(output, key) {
  return new RegExp(`"${key}"\\s*:\\s*true`, 'i').test(output);
}

function extractFirstJsonObject(output) {
  const text = String(output || '');
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, index + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}

function summarizeOutput(output) {
  const redacted = redactCommandOutput(output).trim();
  if (!redacted) {
    return '';
  }
  const compact = redacted.replace(/\s+/g, ' ');
  return compact.length > 1200 ? `${compact.slice(0, 1200)}...` : compact;
}

function analyzeCommandResult(command, result, durationMs) {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const apiCallValues = extractNumbers(output, 'api_calls_made');
  const findingValues = extractNumbers(output, 'finding_count');
  const parsed = extractFirstJsonObject(output);

  return {
    name: command.name,
    command: [command.bin, ...command.args].join(' '),
    ok: result.status === 0,
    exit_code: result.status,
    duration_ms: durationMs,
    api_calls_made: apiCallValues.length ? Math.max(...apiCallValues) : 0,
    quota_consumed: extractBoolean(output, 'quota_consumed'),
    real_qwen_called: extractBoolean(output, 'real_qwen_called'),
    finding_count: findingValues.length ? Math.max(...findingValues) : null,
    parsed_summary: parsed ? {
      status: parsed.status || null,
      ok: typeof parsed.ok === 'boolean' ? parsed.ok : null,
      error_code: parsed.error_code || null,
      can_enter_stage6i: typeof parsed.can_enter_stage6i === 'boolean' ? parsed.can_enter_stage6i : null,
      stage6h_minimum_conditional_pass: typeof parsed.stage6h_minimum_conditional_pass === 'boolean' ? parsed.stage6h_minimum_conditional_pass : null,
      all_manual_required_complete: typeof parsed.all_manual_required_complete === 'boolean' ? parsed.all_manual_required_complete : null,
      build_meta_matches_expected_commit: parsed.build_meta && typeof parsed.build_meta.matches_expected_commit === 'boolean'
        ? parsed.build_meta.matches_expected_commit
        : null
    } : null,
    output_summary: summarizeOutput(output)
  };
}

function spawnCommand(command, options = {}) {
  return new Promise((resolve) => {
    let bin = command.bin;
    let args = command.args;

    if (process.platform === 'win32' && /\.cmd$/i.test(command.bin)) {
      const quote = (value) => {
        const text = String(value);
        return /[\s&()<>|^"]/u.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
      };
      bin = process.env.ComSpec || 'cmd.exe';
      args = ['/d', '/c', [command.bin, ...command.args.map(quote)].join(' ')];
    }

    let child;
    try {
      child = spawn(bin, args, {
        cwd: options.cwd || process.cwd(),
        env: options.env || process.env,
        shell: false
      });
    } catch (error) {
      resolve({ status: 1, stdout: '', stderr: error && error.message ? error.message : String(error) });
      return;
    }

    const stdout = [];
    const stderr = [];

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('error', (error) => {
      resolve({ status: 1, stdout: Buffer.concat(stdout).toString('utf8'), stderr: error.message });
    });
    child.on('close', (status) => {
      resolve({
        status,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8')
      });
    });
  });
}

async function runStage6iPrecheck(options = {}) {
  const env = options.env || process.env;
  const startedAt = Date.now();

  if (options.requireManualResult === true && !options.manualResultFile) {
    return {
      ok: false,
      precheck_ok: false,
      formal_gate_ok: false,
      stage: '6I',
      stage6i_status: 'BLOCKED_BY_STAGE6H_MANUAL_REQUIRED',
      error_code: 'STAGE6I_MANUAL_RESULT_FILE_MISSING',
      message: '--manual-result-file is required when --require-manual-result is used.',
      can_enter_stage6i: false,
      manual_result_required: true,
      manual_result: { status: 'SKIPPED_NO_MANUAL_RESULT_FILE' },
      commands: [],
      command_failure_count: 0,
      api_calls_made: 0,
      quota_consumed: false,
      real_qwen_called: false,
      duration_ms: Date.now() - startedAt
    };
  }

  if (options.requireManualResult === true && !options.expectedCommitSha) {
    return {
      ok: false,
      precheck_ok: false,
      formal_gate_ok: false,
      stage: '6I',
      stage6i_status: 'BLOCKED_BY_STAGE6H_MANUAL_REQUIRED',
      error_code: 'STAGE6I_EXPECTED_COMMIT_REQUIRED',
      message: '--expect-commit is required when --require-manual-result is used.',
      can_enter_stage6i: false,
      manual_result_required: true,
      manual_result: { status: 'NOT_RUN' },
      commands: [],
      command_failure_count: 0,
      api_calls_made: 0,
      quota_consumed: false,
      real_qwen_called: false,
      duration_ms: Date.now() - startedAt
    };
  }

  if (env.PALMMI_ALLOW_REAL_QWEN_TESTS === '1') {
    return {
      ok: false,
      precheck_ok: false,
      stage: '6I',
      error_code: 'STAGE6I_REAL_QWEN_ENV_GUARD',
      message: 'PALMMI_ALLOW_REAL_QWEN_TESTS=1 is not allowed for the zero-cost Stage 6I precheck.',
      commands: [],
      manual_result: { status: 'NOT_RUN' },
      api_calls_made: 0,
      quota_consumed: false,
      real_qwen_called: false,
      duration_ms: Date.now() - startedAt
    };
  }

  const commands = buildStage6iCommands(options);
  const runCommand = options.runCommand || ((command) => spawnCommand(command, {
    cwd: options.cwd,
    env
  }));
  const commandResults = [];

  for (const command of commands) {
    const commandStartedAt = Date.now();
    const result = await runCommand(command);
    const analyzed = analyzeCommandResult(command, result, Date.now() - commandStartedAt);
    commandResults.push(analyzed);
    if (!analyzed.ok) {
      break;
    }
  }

  const commandFailures = commandResults.filter((command) => !command.ok);
  const apiCallsMade = Math.max(0, ...commandResults.map((command) => command.api_calls_made));
  const quotaConsumed = commandResults.some((command) => command.quota_consumed);
  const realQwenCalled = commandResults.some((command) => command.real_qwen_called);
  const securityCommand = commandResults.find((command) => command.name === 'npm run security-scan');
  const manualCommand = commandResults.find((command) => command.name === 'npm run check:stage6h:manual');
  const manualSummary = manualCommand && manualCommand.parsed_summary
    ? {
        status: 'CHECKED',
        can_enter_stage6i: manualCommand.parsed_summary.can_enter_stage6i === true,
        stage6h_minimum_conditional_pass: manualCommand.parsed_summary.stage6h_minimum_conditional_pass === true,
        all_manual_required_complete: manualCommand.parsed_summary.all_manual_required_complete === true
      }
    : { status: options.manualResultFile ? 'CHECK_FAILED_OR_UNREADABLE' : 'SKIPPED_NO_MANUAL_RESULT_FILE' };
  const precheckOk = commandFailures.length === 0
    && apiCallsMade === 0
    && !quotaConsumed
    && !realQwenCalled
    && (!securityCommand || securityCommand.finding_count === null || securityCommand.finding_count === 0);
  const canEnterStage6i = precheckOk && manualSummary.status === 'CHECKED' && manualSummary.can_enter_stage6i;
  const manualResultRequired = options.requireManualResult === true;
  const formalGateOk = canEnterStage6i;
  let errorCode = null;

  if (manualResultRequired && !formalGateOk) {
    errorCode = manualSummary.status === 'SKIPPED_NO_MANUAL_RESULT_FILE'
      ? 'STAGE6I_MANUAL_RESULT_REQUIRED'
      : 'STAGE6I_MANUAL_RESULT_NOT_READY';
  }

  return {
    ok: canEnterStage6i,
    precheck_ok: precheckOk,
    formal_gate_ok: formalGateOk,
    stage: '6I',
    stage6i_status: canEnterStage6i ? 'READY_FOR_CONDITIONAL_CLOSEOUT' : 'BLOCKED_BY_STAGE6H_MANUAL_REQUIRED',
    error_code: errorCode,
    can_enter_stage6i: canEnterStage6i,
    manual_result_required: manualResultRequired,
    manual_result: manualSummary,
    commands: commandResults,
    command_failure_count: commandFailures.length,
    api_calls_made: apiCallsMade,
    quota_consumed: quotaConsumed,
    real_qwen_called: realQwenCalled,
    duration_ms: Date.now() - startedAt,
    note: 'This precheck runs only default zero-cost commands. It must not be used to run real Qwen E2E.'
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--expect-commit') {
      options.expectedCommitSha = argv[index + 1];
      index += 1;
    } else if (arg === '--manual-result-file') {
      options.manualResultFile = argv[index + 1];
      index += 1;
    } else if (arg === '--require-manual-result') {
      options.requireManualResult = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/stage6i/release-candidate-precheck.cjs [--expect-commit SHA] [--manual-result-file PATH] [--require-manual-result]

Runs the zero-cost Stage 6I precheck:
- npm test
- npm run build
- npm run security-scan
- npm run smoke:stage6f:qwen
- npm run preflight:stage6h
- optional npm run check:stage6h:manual -- --file PATH

It refuses to run when PALMMI_ALLOW_REAL_QWEN_TESTS=1 is set.
Use --require-manual-result for the formal Stage 6I gate after true-device results are available.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await runStage6iPrecheck(options);
  console.log(JSON.stringify(result, null, 2));
  if (!result.precheck_ok || (options.requireManualResult && !result.formal_gate_ok)) {
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
  buildStage6iCommands,
  runStage6iPrecheck,
  redactCommandOutput,
  parseArgs,
  spawnCommand
};
