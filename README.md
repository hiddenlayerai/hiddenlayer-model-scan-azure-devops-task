# HiddenLayer Model Scanner Azure DevOps Task

Integrate model scanning into your continuous integration (CI) process with HiddenLayer's Azure DevOps task.

## Installation

To use this Azure DevOps task, you must install it into your Azure DevOps organization. You can do this by following the steps below:
* Browse to the Organization Settings
* Click on Extensions
* Click on "Browse Marketplace"
* Search for "HiddenLayer Model Scanner"
* Install the extension

## Inputs

`modelPath` (required): Path to the model(s), can either be a path to a single model in the repo, or a folder containing the model(s) in the repo

`apiUrl`: URL to the HiddenLayer API if you're using the OEM/self hosted version. Defaults to `https://api.us.hiddenlayer.ai`

`failOnDetection`: True to fail the pipeline if a model is deemed malicious. Defaults to `False`

`hlClientID` (**required for SaaS only**): Your HiddenLayer API Client ID

`hlClientSecret` (**required for SaaS only**): Your HiddenLayer API Client Secret

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
```

Note: Make sure to bring in a variable group with the `HL_CLIENT_ID` and `HL_CLIENT_SECRET` variables.
