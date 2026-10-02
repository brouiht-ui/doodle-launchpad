import {copyFileSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import './sites-env.mjs';
// The bundled production worker avoids a Vinext development-stream issue.
// Wrangler reads secrets beside its generated configuration; never pass them in argv.
if(!existsSync('dist/server/wrangler.json'))throw new Error('Build first: node scripts/run-framework.mjs build');
if(existsSync('.dev.vars'))copyFileSync('.dev.vars','dist/server/.dev.vars');
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','5173','--inspector-port','0'],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
