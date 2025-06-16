# HiddenLayer Model Scanner

Detect malicious code and ensure your models are secure
HiddenLayer Model Scanner prevents security issues by detecting malicious code in your AI models and ensures your AI models are free from adversarial code.

HiddenLayer’s Model Scanner ensures models are free from adversarial code before entering corporate environments. The HiddenLayer Model Scanner allows data science teams to access AI models securely, allowing faster time to model deployment. The HiddenLayer Model Scanner is available via SaaS or on-prem. The Model Scanner integrates seamlessly with modern ML development lifecycles and SecOps workflows. In this era of AI innovation, the Model Scanner is a critical component for rapid collaboration and innovation. Trust, flexibility, and comprehensiveness are non-negotiable when it comes to ensuring your business stays ahead in innovation.

## Key Benefits:

**Powerful**: Scan a broader range of model file types across more MLOps platform scenarios than any other scanner.

**Flexible**: Deploy on-premise and/or SaaS for seamless support in demo, training, and production environments.

**Recognized**: Industry-backed and award-winning, with accolades from RSA Sandbox, M12, IBM, DoD, and MITRE ATLAS alignment for integration into SecOps workflows.

## Key Capabilities:

* Malware Analysis - Scans AI Models for embedded malicious code that could serve as an infection vector & launchpad for malware
    * Scan single files or entire folders
* Model Integrity - Analysis of AI Model’s layers, components & tensors to detect tampering or corruption.
* Uses a combination of static detection and analysis to identify malware, vulnerabilities, model integrity & corruption issues
* Catalog a Known-Good State of your AI Models as a baseline for identifying future tampering
* Supports ChatGPT and LLMs
* Data Leakage — Ensure LLM outputs do not expose backend systems risking privilege escalation or remove code execution.
* Supports a variety of AI Model file types: Pickle, Dill, Joblib, Numpy, Zip, and ONNX

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

    * `communityScan`: Optional parameter to enable the community scan capabilities in model scanner. If not specified model is uploaded to model scanner (Saas or on-prem). Possible values below

    | Community Scan Value | Description | Model Version |
    | -------------------- | ----------- | ------------- |
    | AWS_PRESIGNED        | Presigned S3 URL | N/A |
    | AZURE_BLOB_SAS       | Shared Access Signature (SAS) Azure Blobstore URL | N/A |
    | HUGGING_FACE         | Hugging Face repo | repo branch e.g. main |

    * `azureBlobSasKey`: Optional Azure SAS token for accessing Azure Blob Storage if an Azure Blob Store URL is passed (different than community scan)
    
    > Note: For customers using the Enterprise Self Hosted Model Scanner, please ensure your Github Action runners can make network requests to the Model Scanner API.
### Sample Pipeline
```yaml
#sample azure-pipelines.yaml
trigger:
- main

pool:
  vmImage: ubuntu-latest

variables:
- group: <your_variable_group_name>
- name: System.Debug
  value: true
steps:
- task: ModelScanner@0 #Select version
  inputs:
    #Single file example
    modelPath: 'safe_model.pkl'
    apiUrl: '<hiddenlayer_api_url>'
    failOnDetections: true
    hlClientID: $(HL_CLIENT_ID)
    hlClientSecret: $(HL_CLIENT_SECRET)
- task: ModelScanner@0 #Select version
  inputs:
    #Folder example
    modelPath: 'models/'
    apiUrl: '<hiddenlayer_api_url>'
    failOnDetections: false
    hlClientID: $(HL_CLIENT_ID)
    hlClientSecret: $(HL_CLIENT_SECRET)
```

### Optional Configuations
## Environment Variables

`AWS_ACCESS_KEY_ID`: Required when scanning a model on S3 if not using self hosted runners with access to S3.

`AWS_SECRET_ACCESS_KEY`: Required when scanning a model on S3 if not using self hosted runners with access to S3.

`HUGGINGFACE_TOKEN`: Required if you want to scan private or licensed models. 

## Learn more

[Source Code on GitHub](https://github.com/hiddenlayerai/hiddenlayer-model-scan-azure-devops-task)

[Model Scanner Datasheet](https://query.prod.cms.rt.microsoft.com/cms/api/am/binary/RW1ph9x)

[HiddenLayer Platform](https://hiddenlayer.com/platform)
