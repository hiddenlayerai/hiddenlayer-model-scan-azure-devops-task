// eslint-disable-next-line @typescript-eslint/no-require-imports
import tmrm = require('azure-pipelines-task-lib/mock-run');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import path = require('path');
import { env } from 'process';

const taskPath = path.join(__dirname, '..', 'index.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

console.log(__dirname);
tmr.setInput('modelPath', __dirname + '/models/safe_model.pkl')
tmr.setInput('apiUrl', env['HL_API_URL'] || 'https://api.us.hiddenlayer.ai');
tmr.setInput('hlClientID', env['HL_CLIENT_ID'] || '');
tmr.setInput('hlClientSecret', env['HL_CLIENT_SECRET'] || '');
tmr.setInput('failOnDetections', 'true');

tmr.run();
