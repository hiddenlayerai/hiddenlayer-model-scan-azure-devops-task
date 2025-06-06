import { HiddenLayerServiceClient, ScanReportV3, ResponseError } from '@hiddenlayerai/hiddenlayer-sdk';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import tl = require('azure-pipelines-task-lib/task');
import * as fs from 'fs';

async function run() {
    try {
        const apiUrl: string = tl.getInput('apiUrl', false) || "https://api.us.hiddenlayer.ai";
        const clientId: string = tl.getInput('hlClientId', false) || "";
        const clientSecret: string = tl.getInput('hlClientSecret', false) || "";
        const modelPath: string = tl.getInput('modelPath', true) || "";
        const failOnDetections: boolean = tl.getBoolInput('failOnDetections', false);

        const client = HiddenLayerServiceClient.createSaaSClient(clientId, clientSecret, apiUrl);

        const stats = fs.statSync(modelPath);
        const splitResult = modelPath.split('/');
        if (splitResult[splitResult.length - 1] === '' ) {
            // model path was a folder, so get rid of extra element
            splitResult.pop();
        }
        const modelName: string = splitResult.pop() || 'model';
        let results;
        if (stats.isDirectory()) {
            results = await client.modelScanner.scanFolder(modelName, modelPath);
        } else {
            results = await client.modelScanner.scanFile(modelName, modelPath);
        }
        const anyDetected = await hasDetections(results);
        if (anyDetected) {
            const taskResult = failOnDetections ? tl.TaskResult.Failed : tl.TaskResult.SucceededWithIssues;
            tl.setResult(taskResult, 'One or more models failed one or more safety checks.');
        } else {
            tl.setResult(tl.TaskResult.Succeeded, 'Models are safe. No safety checks failed.');
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err:any) {
        if (err instanceof ResponseError) {
            const body = await err.response.json();
            tl.setResult(tl.TaskResult.Failed, err.message + ' status code: ' + err.response.status + ' body: ' + JSON.stringify(body));
        } else {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    }
}

async function hasDetections(scanReport: ScanReportV3): Promise<boolean> {
    console.log(`Model failed ${scanReport.detectionCount} safety checks.`);
    return scanReport.detectionCount > 0;
}

run();
