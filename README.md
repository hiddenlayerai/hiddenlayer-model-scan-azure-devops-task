# HiddenLayer Model Scanner Azure DevOps Task

Integrate model scanning into your continuous integration (CI) process with HiddenLayer's Azure DevOps task.

## Installation

To use this Azure DevOps task, you must install it into your Azure DevOps organization. You can do this by following the steps below:
* Browse to the Organization Settings
* Click on Extensions
* Click on "Browse Marketplace"
* Search for "HiddenLayer Model Scanner"
* Install the extension
## Setup
### Authentication:

* Navigate to your devops task
* In the library create a new variable group - Remember name for next step
* Add `HL_CLIENT_ID` and `HL_CLIENT_SECRET`
    * If you have a HiddenLayer license these can be created in the HiddenLayer Admin Console  

### Configuration
* In your repository create a `azure-pipelines.yaml` file
* Set variables with the group name assigned previously
* Create a task and target the desired version
* Setup inputs

  * `modelPath` (required): Path to the model(s), can either be a path to a single model in the repo, or a folder containing the model(s) in the repo
  * `apiUrl`: URL to the HiddenLayer API if you're using the OEM/self hosted version. Defaults to `https://api.us.hiddenlayer.ai`
  * `failOnDetection`: True to fail the pipeline if a model is deemed malicious. Defaults to `False`
  * `hlClientID` (**required for SaaS only**): Your HiddenLayer API Client ID
  * `hlClientSecret` (**required for SaaS only**): Your HiddenLayer API Client Secret
  * `modelVersion`: Optional version of model to scan for community scan, e.g. main branch etc. Defaults to main for community scan
  * `sarifFile`: Path to SARIF output file. Compatible with github advanced security.
  * `communityScan`: Optional parameter to enable the community scan capabilities in model scanner. If not specified model is uploaded to model scanner (Saas or on-prem). Possible values below
    | Community Scan Value | Description | Model Version |
    | -------------------- | ----------- | ------------- |
    | AWS_PRESIGNED        | Presigned S3 URL | N/A |
    | AZURE_BLOB_SAS       | Shared Access Signature (SAS) Azure Blobstore URL | N/A |
    | HUGGING_FACE         | Hugging Face repo | repo branch e.g. main |

  * `azureBlobSasKey`: Optional Azure SAS token for accessing Azure Blob Storage if an Azure Blob Store URL is passed (different than community scan)

> Note: For customers using the Enterprise Self Hosted Model Scanner, please ensure your Github Action runners can make network requests to the Model Scanner API.

## Environment Variables

`AWS_ACCESS_KEY_ID`: Required when scanning a model on S3 if not using self hosted runners with access to S3.

`AWS_SECRET_ACCESS_KEY`: Required when scanning a model on S3 if not using self hosted runners with access to S3.

`HUGGINGFACE_TOKEN`: Required if you want to scan private or licensed models.  

## Example Usage

To scan a folder, you can add the following yaml to your pipeline:

```yaml
- task: ModelScanner@0
  inputs:
    modelPath: 'models/'
    apiUrl: 'https://api.us.hiddenlayer.ai'
    failOnDetections: false
    hlClientID: $(HL_CLIENT_ID)
    hlClientSecret: $(HL_CLIENT_SECRET)
    sarifFile: 'models/multi-scan-output.sarif'
```

Note: Make sure to bring in a variable group with the `HL_CLIENT_ID` and `HL_CLIENT_SECRET` variables.
