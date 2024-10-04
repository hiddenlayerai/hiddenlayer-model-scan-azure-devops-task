import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Model Scanner task tests', function () {

  before(() => {

  });

  after(() => {

  });

  it('should succeed if passed a safe model', function(done: Mocha.Done) {
    this.timeout(10000);
  
    const tp: string = path.join(__dirname, 'success.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
  
    tr.runAsync().then(() => {
      assert.equal(tr.succeeded, true, 'should have succeeded');
      assert.equal(tr.warningIssues.length, 0, "should have no warnings");
      assert.equal(tr.errorIssues.length, 0, "should have no errors");
      console.log(tr.stdout);
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
  
      done();
    }).catch((error) => {
      done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should succeed if scanning a folder with no malicious models', function(done: Mocha.Done) {
    this.timeout(20000);
  
    const tp: string = path.join(__dirname, 'folder_success.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.runAsync().then(() => {
      console.log(tr);
        assert.equal(tr.succeeded, true, 'should have succeeded');
        assert.equal(tr.warningIssues.length, 0, "should have no warnings");
        assert.equal(tr.errorIssues.length, 0, "should have no errors");
        console.log(tr.stdout);
        assert.match(tr.stdout, /safe_model.pkl scan status: accepted/);
        done();
    }).catch((error) => {
        done(error); // Ensure the test case fails if there's an error
    });
  });

  it('it should fail if scanning a folder with a malicious model', function(done: Mocha.Done) {
    this.timeout(20000);

    const tp = path.join(__dirname, 'folder_failure.js');
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
});
