"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hiddenlayer_sdk_1 = require("@hiddenlayerai/hiddenlayer-sdk");
const tl = require("azure-pipelines-task-lib/task");
async function run() {
    try {
        const apiUrl = tl.getInput('apiUrl', false) || "https://api.us.hiddenlayer.ai";
        const clientId = tl.getInput('hlClientId', false) || "";
        const clientSecret = tl.getInput('hlClientSecret', false) || "";
        const modelPath = tl.getInput('modelPath', true) || "";
        const modelName = modelPath.split('/').pop() || 'model';
        const failOnDetections = tl.getBoolInput('failOnDetections', false) || true;
        // TODO: Handle Enterprise client creation
        const client = hiddenlayer_sdk_1.HiddenLayerServiceClient.createSaaSClient(clientId, clientSecret, apiUrl);
        const results = await client.modelScanner.scanFile(modelName, modelPath);
        let detected = false;
        if (results.detections.length > 0) {
            console.log(`Found ${results.detections.length} detections`);
            detected = true;
        }
        if (detected) {
            const taskResult = failOnDetections ? tl.TaskResult.Failed : tl.TaskResult.SucceededWithIssues;
            tl.setResult(taskResult, 'Model has detections');
        }
        else {
            tl.setResult(tl.TaskResult.Succeeded, 'Model is clean');
        }
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}
run();
