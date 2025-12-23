import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as fs from 'fs';

describe('Model Scanner task tests', function () {

  before(() => {
    if (fs.existsSync(path.join(__dirname, 'results'))) {
      fs.readdirSync(path.join(__dirname, 'results')).forEach(file => {
        fs.unlinkSync(path.join(__dirname, 'results', file));
      });
    }
  });

  after(() => {

  });

  it('should succeed if passed a safe model', function(done: Mocha.Done) {
    this.timeout(10000);
  
    const tp: string = path.join(__dirname, 'success.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
  
    tr.runAsync().then(() => {
      console.log(tr.stdout);
      assert.equal(tr.succeeded, true, 'should have succeeded');
      assert.equal(tr.warningIssues.length, 0, "should have no warnings");
      assert.equal(tr.errorIssues.length, 0, "should have no errors");

      const sarif = JSON.parse(fs.readFileSync(path.join(__dirname, 'results/results_success.sarif'), 'utf8'));
      assert.equal(sarif.runs[0].results.length, 0, "should have no results");

      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should fail if passed a malicious model', function(done: Mocha.Done) {
    this.timeout(10000);

    const tp = path.join(__dirname, 'failure.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
      assert.equal(tr.succeeded, false, 'should have failed');
      assert.equal(tr.warningIssues.length, 0, "should have no warnings");
      assert.equal(tr.errorIssues.length, 1, "should have 1 error issue");

      const sarif = JSON.parse(fs.readFileSync(path.join(__dirname, 'results/results_failure.sarif'), 'utf8'));
      const uri = sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
      assert.ok(uri.startsWith('file://'), 'uri should start with file://');

      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should succeed if scanning a folder with no malicious models', function(done: Mocha.Done) {
    this.timeout(30000);
  
    const tp: string = path.join(__dirname, 'folder_success.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
        assert.equal(tr.succeeded, true, 'should have succeeded');
        assert.equal(tr.warningIssues.length, 0, "should have no warnings");
        assert.equal(tr.errorIssues.length, 0, "should have no errors");


        const sarif = JSON.parse(fs.readFileSync(path.join(__dirname, 'results/results_folder_success.sarif'), 'utf8'));
        assert.equal(sarif.runs[0].results.length, 0, "should have no results");

        done();
    }).catch((error) => {
        done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should fail if scanning a folder with a malicious model', function(done: Mocha.Done) {
    this.timeout(30000);

    const tp = path.join(__dirname, 'folder_failure.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
      assert.equal(tr.succeeded, false, 'should have failed');
      assert.equal(tr.warningIssues.length, 0, "should have no warnings");
      assert.equal(tr.errorIssues.length, 1, "should have 1 error issue");

      const sarif = JSON.parse(fs.readFileSync(path.join(__dirname, 'results/results_folder_failure.sarif'), 'utf8'));
      const uri = sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
      assert.ok(uri.startsWith('file://'), 'uri should start with file://');
  
      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should succeed with warnings if scanning a folder with a malicious model and failOnDetections is false', function(done: Mocha.Done) {
    this.timeout(30000);

    const tp = path.join(__dirname, 'folder_failure_without_fail_on_detections.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
      assert.equal(tr.succeeded, true, 'should have succeeded');
      assert.equal(tr.warningIssues.length, 1, "should have 1 warning");
      assert.equal(tr.errorIssues.length, 0, "should have 0 errors");

      const sarif = JSON.parse(fs.readFileSync(path.join(__dirname, 'results/results_folder_failure_without_fail_on_detections.sarif'), 'utf8'));
      const uri = sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
      assert.ok(uri.startsWith('file://'), 'uri should start with file://');

      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should succeed when community scanning a malicious model but failOnDetections is false', function(done: Mocha.Done) {
    this.timeout(30000);

    const tp = path.join(__dirname, 'community_scan_success_without_fail_on_detections.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
      assert.equal(tr.succeeded, true, 'should have succeeded');
      assert.equal(tr.warningIssues.length, 1, "should have 1 warning");
      assert.equal(tr.errorIssues.length, 0, "should have 0 errors");
  
      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });

  /* S3 tests are temporarily disabled until we have a way to test them
  it('it should fail if scanning a malicious model from S3', function(done: Mocha.Done) {
    this.timeout(30000);

    const tp = path.join(__dirname, 's3_failure.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
      assert.equal(tr.succeeded, false, 'should have failed');
      assert.equal(tr.warningIssues.length, 0, "should have no warnings");
      assert.equal(tr.errorIssues.length, 1, "should have 1 error issue");
  
      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should succeed with warnings if scanning a malicious model from S3 and failOnDetections is false', function(done: Mocha.Done) {
    this.timeout(30000);

    const tp = path.join(__dirname, 's3_failure_without_fail_on_detections.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
      assert.equal(tr.succeeded, true, 'should have succeeded');
      assert.equal(tr.warningIssues.length, 1, "should have 1 warning");
      assert.equal(tr.errorIssues.length, 0, "should have no errors");

      const sarif = JSON.parse(fs.readFileSync(path.join(__dirname, 'results/results_community_scan_success_without_fail_on_detections.sarif'), 'utf8'));
      const uri = sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
      assert.ok(uri.startsWith('file://'), 'uri should start with file://');
      assert.equal(tr.errorIssues.length, 0, "should have 0 errors");

      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });
  */

  it('it should fail if scanning a malicious model from Azure Blob Storage', function(done: Mocha.Done) {
    this.timeout(30000);

    const tp = path.join(__dirname, 'azure_failure.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
      assert.equal(tr.succeeded, false, 'should have failed');
      assert.equal(tr.warningIssues.length, 0, "should have no warnings");
      assert.equal(tr.errorIssues.length, 1, "should have 1 error issue");
  
      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should succeed with warnings if scanning a malicious model from Azure Blob Storage and failOnDetections is false', function(done: Mocha.Done) {
    this.timeout(30000);

    const tp = path.join(__dirname, 'azure_failure_without_fail_on_detections.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
      assert.equal(tr.succeeded, true, 'should have succeeded');
      assert.equal(tr.warningIssues.length, 1, "should have 1 warning");
      assert.equal(tr.errorIssues.length, 0, "should have 0 errors");

      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
    
  });
});
