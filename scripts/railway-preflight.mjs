import { readFileSync, existsSync } from 'node:fs';
const read = p => readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
const config = JSON.parse(read('railway.json'));
const checks = [
  ['Dockerfile present', existsSync('Dockerfile')],
  ['Railway config uses Dockerfile', config.build?.builder === 'DOCKERFILE'],
  ['Server entrypoint exists', existsSync('server/_core/index.ts')],
  ['Build script targets server entrypoint', pkg.scripts?.build?.includes('server/_core/index.ts')],
  ['Health route exists', read('server/_core/index.ts').includes('app.get("/health"')],
  ['Server binds injected port', read('server/_core/index.ts').includes('process.env.PORT')],
  ['Public frontend output configured', read('vite.config.ts').includes('"dist/public"')],
  ['Frozen lockfile present', existsSync('pnpm-lock.yaml')],
  ['Demo authentication issuance absent', !read('server/_core/context.ts').includes('jwtSign(')],
  ['No checked-in .env', !existsSync('.env')],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log('NOTE: static configuration checks only, not a successful image build or authentication test.');
if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
