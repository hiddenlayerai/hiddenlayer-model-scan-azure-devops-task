// eslint-disable-next-line @typescript-eslint/no-require-imports
import tmrm = require('azure-pipelines-task-lib/mock-run');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import path = require('path');
import * as process from 'process';

const taskPath = path.join(__dirname, '..', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

console.log(__dirname);
tmr.setInput('modelPath', 'ScanMe/Models');
tmr.setInput('apiUrl', process.env['HL_API_URL'] || 'https://api.us.hiddenlayer.ai');
tmr.setInput('hlClientID', process.env['HL_CLIENT_ID'] || '');
tmr.setInput('hlClientSecret', process.env['HL_CLIENT_SECRET'] || '');
tmr.setInput('failOnDetection', 'false');
tmr.setInput('sarifFile', __dirname + '/results/results_community_scan_success_without_fail_on_detections.sarif');
tmr.setInput('communityScan', 'HUGGING_FACE');
tmr.setInput('modelVersion', 'main');

tmr.run(); 