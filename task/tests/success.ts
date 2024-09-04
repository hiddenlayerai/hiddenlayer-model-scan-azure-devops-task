import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import { dir } from 'console';
import path = require('path');
import { env } from 'process';

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

console.log(__dirname);
tmr.setInput('modelPath', __dirname + '/models/safe_model.pkl')
tmr.setInput('hlClientID', env['HL_CLIENT_ID'] || '');
tmr.setInput('hlClientSecret', env['HL_CLIENT_SECRET'] || '');

tmr.run();