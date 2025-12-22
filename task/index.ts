import { HiddenLayer, CommunityScanSource, APIError } from '@hiddenlayerai/hiddenlayer-sdk';
import type { ScanReport } from '@hiddenlayerai/hiddenlayer-sdk/resources/scans/results';
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
        const failOnDetections: boolean = tl.getBoolInput('failOnDetections', false);
        const sarifFile: string = tl.getInput('sarifFile', false) || "";
        const communityScan: string = tl.getInput('communityScan', false) || "";
        const modelVersion: string = tl.getInput('modelVersion', false) || "";
        const azureBlobSasKey: string = tl.getInput('azureBlobSasKey', false) || "";

        const client = new HiddenLayer({ clientID: clientId, clientSecret: clientSecret, baseURL: apiUrl });

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

        let results: ScanReport;
        
        // Handle community scanning first, similar to Python implementation
        if (communityScan) {
            let scanSource: string;
            let version: string = modelVersion;
            
            // Map community scan types to SDK constants
            switch (communityScan) {
                case 'HUGGING_FACE':
                    scanSource = CommunityScanSource.HUGGING_FACE;
                    // Default to 'main' for Hugging Face if no version specified
                    if (!version) {
                        version = 'main';
                    }
                    break;
                case 'AWS_PRESIGNED':
                    scanSource = CommunityScanSource.AWS_PRESIGNED;
                    break;
                case 'AZURE_BLOB_SAS':
                    scanSource = CommunityScanSource.AZURE_BLOB_SAS;
                    break;
                default:
                    throw new Error(`Unsupported community scan type: ${communityScan}`);
            }
            
            // For community scan types other than Hugging Face, require model version
            if (communityScan !== 'HUGGING_FACE' && !version) {
                throw new Error('When running a community scan other than a Hugging Face model, you must provide a model version.');
            }
            
            // Derive modelName from modelPath if not explicitly provided
            if (!modelName) {
                const splitResult = modelPath.split('/');
                if (splitResult[splitResult.length - 1] === '') {
                    splitResult.pop();
                }
                modelName = splitResult.pop() || 'model';
            }
            
            results = await client.communityScanner.communityScan({
                modelName,
                modelPath,
                modelSource: scanSource,
                modelVersion: version
            });
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
                
                results = await client.modelScanner.scanS3Model({
                    modelName,
                    bucket,
                    key
                });
            } else if (modelPathUri.protocol === "https:" && modelPathUri.hostname.endsWith("blob.core.windows.net")) {
                // Handle Azure Blob Storage model scanning
                const accountUrl = `${modelPathUri.protocol}//${modelPathUri.hostname}${azureBlobSasKey ? `?${azureBlobSasKey}` : ''}`;
                const pathParts = modelPathUri.pathname.substring(1).split('/'); // Remove leading "/"
                const container = pathParts[0];
                const blob = pathParts.slice(1).join('/');
                
                // Extract model name from the blob path (similar to Python implementation)
                const blobParts = blob.split('/');
                modelName = modelName || blobParts[blobParts.length - 1] || 'model';
                
                results = await client.modelScanner.scanAzureBlobModel({
                    modelName, 
                    accountUrl, 
                    container, 
                    blob
                });
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
                    results = await client.modelScanner.scanFolder({ modelName, path: modelPath });
                } else {
                    results = await client.modelScanner.scanFile({ modelName, modelPath });
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
                results = await client.modelScanner.scanFolder({ modelName, path: modelPath });
            } else {
                results = await client.modelScanner.scanFile({ modelName, modelPath });
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
            const sarifOutput = await client.scans.results.sarif(results.scan_id);
            const githubCompatibleSarif = makeGithubCompatibleSarif(sarifOutput);
            await fs.promises.writeFile(sarifFile, githubCompatibleSarif);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err:any) {
        if (err instanceof APIError) {
            tl.setResult(tl.TaskResult.Failed, err.message + ' status code: ' + err.status + ' body: ' + JSON.stringify(err.error));
        } else {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    }
}

async function hasDetections(scanReport: ScanReport): Promise<boolean> {
    console.log(`Model failed ${scanReport.summary?.detection_count || 0} safety checks.`);
    return (scanReport.summary?.detection_count || 0) > 0;
}

interface SarifOutput {
    runs: Array<{
        results?: Array<{
            locations?: Array<{
                physicalLocation?: {
                    artifactLocation?: {
                        uri?: string;
                    };
                };
            }>;
        }>;
    }>;
}

function makeGithubCompatibleSarif(sarifOutput: string | object): string {
    const sarif: SarifOutput = typeof sarifOutput === 'string' ? JSON.parse(sarifOutput) : sarifOutput as SarifOutput;
    for (const run of sarif.runs) {
        for (const result of run.results || []) {
            for (const location of result.locations || []) {
                if (location.physicalLocation?.artifactLocation?.uri) {
                    const originalUri = location.physicalLocation.artifactLocation.uri;
                    // Only try to convert URIs that look like valid URLs
                    if (isValidUrl(originalUri)) {
                        try {
                            const uri = new URL(originalUri);
                            uri.protocol = 'file:';
                            location.physicalLocation.artifactLocation.uri = uri.toString();
                        } catch {
                            // If URL parsing fails, prefix with file://
                            location.physicalLocation.artifactLocation.uri = `file://${originalUri}`;
                        }
                    } else {
                        // For non-URL paths, prefix with file://
                        location.physicalLocation.artifactLocation.uri = `file://${originalUri}`;
                    }
                }
            }
        }
    }
    return JSON.stringify(sarif);
}

run();
