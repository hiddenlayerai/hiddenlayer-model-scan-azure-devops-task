import { HiddenLayerServiceClient, ScanReportV3, ResponseError, Sarif210, ScanJobAccessSourceEnum } from '@hiddenlayerai/hiddenlayer-sdk';
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
        const sarifFile: string = tl.getInput('sarifFile', false) || "";
        const communityScan: string = tl.getInput('communityScan', false) || "";
        const modelVersion: string = tl.getInput('modelVersion', false) || "";

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

        const splitResult = modelPath.split('/');
        if (splitResult[splitResult.length - 1] === '' ) {
            // model path was a folder, so get rid of extra element
            splitResult.pop();
        }
        const modelName: string = splitResult.pop() || 'model';
        
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
                case 'AWS_IAM_ROLE':
                    scanType = ScanJobAccessSourceEnum.AwsIamRole;
                    break;
                case 'AZURE_BLOB_SAS':
                    scanType = ScanJobAccessSourceEnum.AzureBlobSas;
                    break;
                case 'AZURE_BLOB_AD':
                    scanType = ScanJobAccessSourceEnum.AzureBlobAd;
                    break;
                case 'GOOGLE_SIGNED':
                    scanType = ScanJobAccessSourceEnum.GoogleSigned;
                    break;
                case 'GOOGLE_OAUTH':
                    scanType = ScanJobAccessSourceEnum.GoogleOauth;
                    break;
                default:
                    throw new Error(`Unsupported community scan type: ${communityScan}`);
            }
            
            // For community scan types other than Hugging Face, require model version
            if (communityScan !== 'HUGGING_FACE' && !version) {
                throw new Error('When running a community scan other than a Hugging Face model, you must provide a model version.');
            }
            
            results = await client.modelScanner.communityScan(modelName, modelPath, scanType, version);
        } else {
            // Handle local file/folder scanning
            const stats = fs.statSync(modelPath);
            if (stats.isDirectory()) {
                results = await client.modelScanner.scanFolder(modelName, modelPath);
            } else {
                results = await client.modelScanner.scanFile(modelName, modelPath);
            }
        }
        
        const anyDetected = await hasDetections(results);
        if (anyDetected) {
            const taskResult = failOnDetections ? tl.TaskResult.Failed : tl.TaskResult.SucceededWithIssues;
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
