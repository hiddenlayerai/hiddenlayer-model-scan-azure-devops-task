import { HiddenLayerServiceClient, ScanReportV3, ResponseError, Sarif210, ScanJobAccessSourceEnum } from '@hiddenlayerai/hiddenlayer-sdk';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import tl = require('azure-pipelines-task-lib/task');
import * as fs from 'fs';
import * as path from 'path';

function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

async function run() {
    try {
        let modelName: string = tl.getInput('modelName', false) || "";
        const apiUrl: string = tl.getInput('apiUrl', false) || "https://api.us.hiddenlayer.ai";
        const clientId: string = tl.getInput('hlClientId', false) || "";
        const clientSecret: string = tl.getInput('hlClientSecret', false) || "";
        const modelPath: string = tl.getInput('modelPath', true) || "";
        const failOnDetection: boolean = tl.getBoolInput('failOnDetection', false);
        const sarifFile: string = tl.getInput('sarifFile', false) || "";
        const communityScan: string = tl.getInput('communityScan', false) || "";
        const modelVersion: string = tl.getInput('modelVersion', false) || "";
        const azureBlobSasKey: string = tl.getInput('azureBlobSasKey', false) || "";

        const client = HiddenLayerServiceClient.createSaaSClient(clientId, clientSecret, apiUrl);

        if (sarifFile) {
            try {
                const sarifFileDir = path.dirname(path.resolve(sarifFile));
                if (!fs.existsSync(sarifFileDir)) {
                    fs.mkdirSync(sarifFileDir, { recursive: true });
                }
                else {
                    await fs.promises.access(sarifFileDir, fs.constants.W_OK);
                }
            } catch {
                throw new Error(`The current user does not have permissions to write to ${path.resolve(sarifFile)}`);
            }
        }

        let results: ScanReportV3;
        
        // Handle community scanning first, similar to Python implementation
        if (communityScan) {
            let scanType: ScanJobAccessSourceEnum;
            let version: string = modelVersion;
            
            // Map community scan types to SDK enum values
            switch (communityScan) {
                case 'HUGGING_FACE':
                    scanType = ScanJobAccessSourceEnum.HuggingFace;
                    // Default to 'main' for Hugging Face if no version specified
                    if (!version) {
                        version = 'main';
                    }
                    break;
                case 'AWS_PRESIGNED':
                    scanType = ScanJobAccessSourceEnum.AwsPresigned;
                    break;
                case 'AZURE_BLOB_SAS':
                    scanType = ScanJobAccessSourceEnum.AzureBlobSas;
                    break;
                default:
                    throw new Error(`Unsupported community scan type: ${communityScan}`);
            }
            
            // For community scan types other than Hugging Face, require model version
            if (communityScan !== 'HUGGING_FACE' && !version) {
                throw new Error('When running a community scan other than a Hugging Face model, you must provide a model version.');
            }
            
            results = await client.modelScanner.communityScan(modelName, modelPath, scanType, version);
        } else if (isValidUrl(modelPath)) {
            // Parse URL once and reuse it
            const modelPathUri = new URL(modelPath);
            
            if (modelPathUri.protocol === "s3:") {
                // Handle S3 model scanning
                const s3Path = modelPath.substring(5); // Remove "s3://" prefix
                const pathParts = s3Path.split('/');
                const bucket = pathParts[0];
                const key = pathParts.slice(1).join('/');
                
                // Extract model name from the key (similar to Python implementation)
                const keyParts = key.split('/');
                modelName = modelName || keyParts[keyParts.length - 1] || 'model';
                
                results = await client.modelScanner.scanS3Model(modelName, bucket, key);
            } else if (modelPathUri.protocol === "https:" && modelPathUri.hostname.endsWith("blob.core.windows.net")) {
                // Handle Azure Blob Storage model scanning
                const accountUrl = `${modelPathUri.protocol}//${modelPathUri.hostname}`;
                const pathParts = modelPathUri.pathname.substring(1).split('/'); // Remove leading "/"
                const container = pathParts[0];
                const blob = pathParts.slice(1).join('/');
                
                // Extract model name from the blob path (similar to Python implementation)
                const blobParts = blob.split('/');
                modelName = modelName || blobParts[blobParts.length - 1] || 'model';
                
                results = await client.modelScanner.scanAzureBlobModel(
                    modelName, 
                    accountUrl, 
                    container, 
                    blob,
                    '',
                    azureBlobSasKey
                );
            } else {
                // Handle local file/folder scanning for invalid URLs
                const stats = fs.statSync(modelPath);
                const splitResult = modelPath.split('/');
                if (splitResult[splitResult.length - 1] === '' ) {
                    // model path was a folder, so get rid of extra element
                    splitResult.pop();
                }
                modelName = modelName || splitResult.pop() || 'model';
                
                if (stats.isDirectory()) {
                    results = await client.modelScanner.scanFolder(modelName, modelPath);
                } else {
                    results = await client.modelScanner.scanFile(modelName, modelPath);
                }
            }
        } else {
            // Handle local file/folder scanning
            const stats = fs.statSync(modelPath);
            const splitResult = modelPath.split('/');
            if (splitResult[splitResult.length - 1] === '' ) {
                // model path was a folder, so get rid of extra element
                splitResult.pop();
            }
            modelName = modelName || splitResult.pop() || 'model';
            
            if (stats.isDirectory()) {
                results = await client.modelScanner.scanFolder(modelName, modelPath);
            } else {
                results = await client.modelScanner.scanFile(modelName, modelPath);
            }
        }

        const anyDetected = await hasDetections(results);
        if (anyDetected) {
            const taskResult = failOnDetection ? tl.TaskResult.Failed : tl.TaskResult.SucceededWithIssues;
            tl.setResult(taskResult, 'One or more models failed one or more safety checks.');
        } else {
            tl.setResult(tl.TaskResult.Succeeded, 'Models are safe. No safety checks failed.');
        }
        if (sarifFile) {
            const sarifOutput = await client.modelScanner.getSarifResults(results.scanId);
            const githubCompatibleSarif = makeGithubCompatibleSarif(sarifOutput);
            await fs.promises.writeFile(sarifFile, JSON.stringify(githubCompatibleSarif));
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

function makeGithubCompatibleSarif(sarifOutput: Sarif210): Sarif210 {
    for (const run of sarifOutput.runs) {
        for (const result of run.results || []) {
            for (const location of result.locations || []) {
                if (location.physicalLocation?.artifactLocation?.uri) {
                    const uri = new URL(location.physicalLocation.artifactLocation.uri);
                    uri.protocol = 'file:';
                    location.physicalLocation.artifactLocation.uri = uri.toString();
                }
            }
        }
    }
    return sarifOutput;
}

run();
