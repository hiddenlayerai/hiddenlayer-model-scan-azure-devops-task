import { HiddenLayerServiceClient } from '@hiddenlayerai/hiddenlayer-sdk';
import tl = require('azure-pipelines-task-lib/task');

async function run() {
    try {
        const apiUrl: string = tl.getInput('apiUrl', false) || "https://api.us.hiddenlayer.ai";
        const clientId: string = tl.getInput('hlClientId', false) || "";
        const clientSecret: string = tl.getInput('hlClientSecret', false) || "";
        const modelPath: string = tl.getInput('modelPath', true) || "";
        const modelName: string = modelPath.split('/').pop() || 'model';
        const failOnDetections: boolean = tl.getBoolInput('failOnDetections', false) || true;

        // TODO: Handle Enterprise client creation
        const client = HiddenLayerServiceClient.createSaaSClient(clientId, clientSecret, apiUrl);
        const results = await client.modelScanner.scanFile(modelName, modelPath);

        let detected = false;
        if (results.detections.length > 0) {
            console.log(`Model failed ${results.detections.length} safety checks.`);
            detected = true
        }

        if (detected) {
            const taskResult = failOnDetections ? tl.TaskResult.Failed : tl.TaskResult.SucceededWithIssues;
            tl.setResult(taskResult, 'Model failed one or more safety checks.');
        } else {
            tl.setResult(tl.TaskResult.Succeeded, 'Model is safe. No safety checks failed.');
        }
    }
    catch (err:any) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

run();