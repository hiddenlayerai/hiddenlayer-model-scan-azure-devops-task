import { HiddenLayerServiceClient } from '@hiddenlayerai/hiddenlayer-sdk';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import tl = require('azure-pipelines-task-lib/task');
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    try {
        const apiUrl: string = tl.getInput('apiUrl', false) || "https://api.us.hiddenlayer.ai";
        const clientId: string = tl.getInput('hlClientId', false) || "";
        const clientSecret: string = tl.getInput('hlClientSecret', false) || "";
        const modelPath: string = tl.getInput('modelPath', true) || "";
        const failOnDetections: boolean = tl.getBoolInput('failOnDetections', false);

        const stats = fs.statSync(modelPath);
        if (stats.isDirectory()) {
            let anyDetected = false;
            await Promise.all(fs.readdirSync(modelPath).map(async file => {
                const detected = await scanFile(clientId, clientSecret, apiUrl, path.join(modelPath, file));
                if (detected) {
                    anyDetected = true;
                }
            }));
            if (anyDetected) {
                const taskResult = failOnDetections ? tl.TaskResult.Failed : tl.TaskResult.SucceededWithIssues;
                tl.setResult(taskResult, 'One or more models failed one or more safety checks.');
            } else {
                tl.setResult(tl.TaskResult.Succeeded, 'Models are safe. No safety checks failed.');
            }
        } else {
            const detected = await scanFile(clientId, clientSecret, apiUrl, modelPath);
            if (detected) {
                const taskResult = failOnDetections ? tl.TaskResult.Failed : tl.TaskResult.SucceededWithIssues;
                tl.setResult(taskResult, 'Model failed one or more safety checks.');
            } else {
                tl.setResult(tl.TaskResult.Succeeded, 'Model is safe. No safety checks failed.');
            }
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err:any) {
        console.log(err);
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

async function scanFile(clientId: string, clientSecret: string, apiUrl: string, modelPath: string): Promise<boolean> {
    // TODO: Handle Enterprise client creation
    const modelName: string = modelPath.split('/').pop() || 'model';
    const client = HiddenLayerServiceClient.createSaaSClient(clientId, clientSecret, apiUrl);
    const results = await client.modelScanner.scanFile(modelName, modelPath);

    let detected = false;
    if (results.detections.length > 0) {
        console.log(`Model failed ${results.detections.length} safety checks.`);
        detected = true
    }

    return detected;
}

run();
