// eslint-disable-next-line @typescript-eslint/no-require-imports
import tmrm = require('azure-pipelines-task-lib/mock-run');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import path = require('path');
import { env } from 'process';

import * as os from 'os';
import * as fs from 'fs';

const taskPath = path.join(__dirname, '..', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'hl-'));
fs.copyFileSync(path.join(__dirname, 'models', 'safe_model.pkl'), path.join(tmpdir, 'safe_model.pkl'));

console.log(__dirname);
tmr.setInput('modelPath', tmpdir)
tmr.setInput('apiUrl', env['HL_API_URL'] || 'https://api.us.hiddenlayer.ai');
tmr.setInput('hlClientID', env['HL_CLIENT_ID'] || '');
tmr.setInput('hlClientSecret', env['HL_CLIENT_SECRET'] || '');
tmr.setInput('failOnDetection', 'true');
tmr.setInput('sarifFile', __dirname + '/results/results_folder_success.sarif');

tmr.run();
