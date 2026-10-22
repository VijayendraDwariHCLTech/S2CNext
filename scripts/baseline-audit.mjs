import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const checks=[];
function check(name,pass,detail){checks.push({name,status:pass?'PASS':'BLOCKED',detail});}
for (const [name,key] of [['development','dev'],['production bundle','build']]){
 const m=pkg.scripts[key]?.match(/server\/_core\/index\.ts/);
 check(`${name} server entrypoint`,!m || fs.existsSync(path.join(root,'server/_core/index.ts')),m?'Configured _core/index.ts is missing':'Entry point present');
}
const router=fs.readFileSync('server/routers.ts','utf8');
for(const [label,pattern] of [['generic database write',/applyChanges:\s*publicProcedure/],['demo database reset',/resetDemo:\s*publicProcedure/],['AI provider update',/setAiProvider:\s*publicProcedure/]]){
 check(`protected ${label}`,!pattern.test(router),pattern.test(router)?'Public transport procedure: requires authenticated authorization':'No obvious public procedure pattern');
}
check('core tRPC infrastructure',fs.existsSync('server/_core/trpc.ts')&&fs.existsSync('server/_core/context.ts'),'Required infrastructure files not bundled');
check('dependency directory',fs.existsSync('node_modules'),'Install dependencies before running type checks');
check('migration metadata',fs.readdirSync('drizzle').some(x=>x.endsWith('.sql')||x==='meta'),'No migration history included');
console.log(JSON.stringify({project:pkg.name,checks,summary:{pass:checks.filter(x=>x.status==='PASS').length,blocked:checks.filter(x=>x.status==='BLOCKED').length}},null,2));
if(checks.some(x=>x.status==='BLOCKED'))process.exitCode=1;
