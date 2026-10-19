'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');

assert.equal(process.versions.node.split('.')[0], '22', 'Validate with the Lambda Node22 major');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-package-'));
const configPath = path.join(root, `.serverless-validation-${process.pid}.yml`);
const cli = require.resolve('serverless/bin/serverless.js');
const configuration = yaml.load(fs.readFileSync(path.join(root, 'serverless.yml'), 'utf8'));
const environment = yaml.load(fs.readFileSync(path.join(root, 'serverless/environment.yml'), 'utf8'));
configuration.provider.environment = Object.fromEntries(Object.keys(environment).map(key => [key, 'offline-validation']));
configuration.provider.environment.STAGE = 'validation';
const childEnvironment = {
  ...process.env,
  AWS_EC2_METADATA_DISABLED: 'true',
  SLS_TELEMETRY_DISABLED: '1',
};
// No credentials or shared AWS profiles are needed by offline packaging.
for (const key of Object.keys(childEnvironment)) {
  if (key.startsWith('AWS_') && key !== 'AWS_EC2_METADATA_DISABLED') delete childEnvironment[key];
}
childEnvironment.AWS_SHARED_CREDENTIALS_FILE = path.join(temporary, 'no-credentials');
childEnvironment.AWS_CONFIG_FILE = path.join(temporary, 'no-config');

const run = (args) => spawnSync(process.execPath, [cli, ...args], {
  cwd: root, env: childEnvironment, encoding: 'utf8', timeout: 120000,
});

try {
  fs.writeFileSync(configPath, yaml.dump(configuration));
  const result = run(['package', '--config', configPath, '--stage', 'validation', '--package', temporary]);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
  const template = JSON.parse(fs.readFileSync(path.join(temporary, 'cloudformation-template-update-stack.json'), 'utf8'));
  const functions = Object.values(template.Resources).filter(resource => resource.Type === 'AWS::Lambda::Function');
  assert.equal(functions.length, 2, 'Both handlers must be packaged');
  for (const resource of functions) assert.equal(resource.Properties.Runtime, 'nodejs22.x');
  const zip = fs.readdirSync(temporary).find(name => name.endsWith('.zip'));
  assert.ok(zip, 'Deployment ZIP must exist');
  const unpack = path.join(temporary, 'unpacked');
  fs.mkdirSync(unpack);
  const unzip = spawnSync('unzip', ['-q', path.join(temporary, zip), '-d', unpack], { encoding: 'utf8' });
  assert.equal(unzip.status, 0, unzip.stderr);
  const smoke = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const { api: verify } = require('./src/verifyToken.js');
    const { api: message } = require('./src/messageProcessor.js');
    Promise.all([
      verify({ queryStringParameters: { 'hub.challenge': 'offline-challenge' } }).then(response => {
        assert.equal(response.statusCode, 200); assert.equal(response.body, 'offline-challenge');
      }),
      message({ body: JSON.stringify({ entry: [] }) }).then(response => assert.equal(response.statusCode, 200)),
    ]).catch(error => { console.error(error); process.exitCode = 1; });
  `], {
    cwd: unpack, encoding: 'utf8', timeout: 15000,
    env: { ...childEnvironment, ...configuration.provider.environment },
  });
  assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);

  // The compatibility enum must not weaken validation of other runtimes or fields.
  configuration.provider.runtime = 'nodejs999.x';
  fs.writeFileSync(configPath, yaml.dump(configuration));
  const invalid = run(['package', '--config', configPath, '--stage', 'validation', '--package', temporary]);
  assert.notEqual(invalid.status, 0, 'Unsupported runtime must fail validation');
  assert.match(invalid.stderr + invalid.stdout, /provider\.runtime/);
  console.log('Offline package: 2 Node22 Lambda handlers, ZIP smoke and strict runtime validation passed');
} finally {
  fs.rmSync(configPath, { force: true });
  fs.rmSync(temporary, { recursive: true, force: true });
}
