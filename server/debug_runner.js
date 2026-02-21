import { spawn } from 'child_process';
import fs from 'fs';

console.log('Starting server debug capture...');

const out = fs.openSync('./debug_out.log', 'w');
const err = fs.openSync('./debug_err.log', 'w');

const env = { ...process.env };

const child = spawn('node', ['src/index.js'], {
  env: env,
  stdio: [ 'ignore', out, err ]
});

console.log(`Server started with PID: ${child.pid}`);

child.on('exit', (code, signal) => {
    console.log(`Server exited with code ${code} and signal ${signal}`);
    fs.appendFileSync('./debug_err.log', `\nEXITED: ${code} ${signal}\n`);
});
