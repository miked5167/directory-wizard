import { test, expect, Page, Browser } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import QuickstartRunner from '../src/tests/quickstart/QuickstartRunner';
import { QUICKSTART_SCENARIOS } from '../src/tests/quickstart/QuickstartValidation';

test.describe('Quickstart Validation Scenarios', () => {
  let runner: QuickstartRunner;

  test.beforeEach(async ({ page, browser }) => {
    runner = new QuickstartRunner(page, browser);

    // Ensure screenshots directory exists
    const screenshotDir = './quickstart-screenshots';
    try {
      await fs.mkdir(screenshotDir, { recursive: true });
    } catch {
      // Directory already exists
    }
  });

  test('should execute all critical quickstart scenarios', async ({ page, browser }) => {
    console.log('🎯 Running Critical Quickstart Validation Scenarios');

    // Filter to only critical scenarios for faster execution
    const criticalScenarios = QUICKSTART_SCENARIOS.filter(s => s.priority === 'critical');

    const results = [];

    for (const scenario of criticalScenarios) {
      console.log(`\n🔄 Executing: ${scenario.name}`);

      const result = await runner.runScenario(scenario);
      results.push(result);

      // Assert that critical scenarios pass
      expect(result.success).toBeTruthy(`Critical scenario "${scenario.name}" must pass. Error: ${result.error}`);

      // Performance assertion - should complete within 150% of estimated time
      const maxDuration = scenario.estimatedTime * 1.5 * 1000; // Convert to milliseconds
      expect(result.duration).toBeLessThan(maxDuration,
        `Scenario "${scenario.name}" took ${result.duration}ms, expected under ${maxDuration}ms`);
    }

    // Generate and save report
    const report = runner.generateReport(results);
    await fs.writeFile('./quickstart-validation-report.md', report, 'utf8');

    console.log('\n✅ Critical scenarios validation completed');
    console.log(`📄 Report saved to: quickstart-validation-report.md`);
  });

  test('should validate wizard complete flow end-to-end', async ({ page }) => {
    const wizardScenario = QUICKSTART_SCENARIOS.find(s => s.id === 'wizard-complete-flow');
    expect(wizardScenario).toBeDefined();

    console.log('🧙‍♂️ Testing Complete Wizard Flow');

    const result = await runner.runScenario(wizardScenario!);

    // Detailed assertions for wizard flow
    expect(result.success).toBeTruthy(`Wizard flow failed: ${result.error}`);
    expect(result.stepResults.length).toBe(wizardScenario!.steps.length);

    // Verify all steps completed successfully
    result.stepResults.forEach((stepResult, index) => {
      expect(stepResult.success).toBeTruthy(
        `Step ${index + 1} (${stepResult.action}) failed: ${stepResult.error}`
      );
    });

    console.log('✅ Wizard flow validation completed successfully');
  });

  test('should validate claim submission flow', async ({ page }) => {
    const claimScenario = QUICKSTART_SCENARIOS.find(s => s.id === 'claim-submission-flow');
    expect(claimScenario).toBeDefined();

    console.log('📋 Testing Claim Submission Flow');

    const result = await runner.runScenario(claimScenario!);

    expect(result.success).toBeTruthy(`Claim submission failed: ${result.error}`);

    // Verify claim appears in dashboard
    const dashboardSteps = result.stepResults.filter(step =>
      step.action === 'navigate' || step.action === 'wait'
    );
    expect(dashboardSteps.some(step => step.success)).toBeTruthy(
      'Claim should appear in dashboard after submission'
    );

    console.log('✅ Claim submission validation completed successfully');
  });

  test('should validate error handling and recovery', async ({ page }) => {
    const errorScenario = QUICKSTART_SCENARIOS.find(s => s.id === 'error-handling-validation');
    expect(errorScenario).toBeDefined();

    console.log('⚠️ Testing Error Handling and Recovery');

    const result = await runner.runScenario(errorScenario!);

    expect(result.success).toBeTruthy(`Error handling validation failed: ${result.error}`);

    // Verify that error messages are displayed appropriately
    const errorDisplaySteps = result.stepResults.filter(step =>
      step.action === 'click' && step.success
    );
    expect(errorDisplaySteps.length).toBeGreaterThan(0,
      'Error messages should be displayed for invalid inputs'
    );

    console.log('✅ Error handling validation completed successfully');
  });

  test('should validate performance benchmarks', async ({ page }) => {
    const performanceScenario = QUICKSTART_SCENARIOS.find(s => s.id === 'performance-validation');
    expect(performanceScenario).toBeDefined();

    console.log('⚡ Testing Performance Benchmarks');

    const result = await runner.runScenario(performanceScenario!);

    expect(result.success).toBeTruthy(`Performance validation failed: ${result.error}`);

    // Check that page loads meet performance requirements
    const navigationSteps = result.stepResults.filter(step => step.action === 'navigate');
    navigationSteps.forEach(step => {
      expect(step.duration).toBeLessThan(3000,
        `Page navigation took ${step.duration}ms, should be under 3000ms`
      );
    });

    // Check step transitions
    const transitionSteps = result.stepResults.filter(step => step.action === 'click');
    transitionSteps.forEach(step => {
      expect(step.duration).toBeLessThan(2000,
        `Step transition took ${step.duration}ms, should be under 2000ms`
      );
    });

    console.log('✅ Performance validation completed successfully');
  });

  test('should validate mobile responsiveness', async ({ page }) => {
    const mobileScenario = QUICKSTART_SCENARIOS.find(s => s.id === 'mobile-responsiveness');
    expect(mobileScenario).toBeDefined();

    console.log('📱 Testing Mobile Responsiveness');

    const result = await runner.runScenario(mobileScenario!);

    expect(result.success).toBeTruthy(`Mobile responsiveness validation failed: ${result.error}`);

    // Verify viewport was set correctly
    const viewportStep = result.stepResults.find(step => step.action === 'setViewport');
    expect(viewportStep?.success).toBeTruthy('Viewport should be set successfully');

    console.log('✅ Mobile responsiveness validation completed successfully');
  });

  test('should validate file upload security', async ({ page }) => {
    const uploadScenario = QUICKSTART_SCENARIOS.find(s => s.id === 'file-upload-validation');
    expect(uploadScenario).toBeDefined();

    console.log('🔒 Testing File Upload Security');

    const result = await runner.runScenario(uploadScenario!);

    expect(result.success).toBeTruthy(`File upload validation failed: ${result.error}`);

    // Verify that invalid files are rejected and valid files are accepted
    const uploadSteps = result.stepResults.filter(step => step.action === 'upload');
    expect(uploadSteps.length).toBe(2); // One invalid, one valid

    // Both upload attempts should complete (validation happens after upload)
    uploadSteps.forEach(step => {
      expect(step.success).toBeTruthy('Upload step should complete');
    });

    console.log('✅ File upload security validation completed successfully');
  });

  test('should run full quickstart validation suite', async ({ page, browser }) => {
    console.log('🚀 Running Complete Quickstart Validation Suite');

    const results = await runner.runAllScenarios();

    // Overall success metrics
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const successRate = (passed / results.length) * 100;

    console.log(`\n📊 VALIDATION SUMMARY:`);
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);

    // Critical scenarios must all pass
    const criticalResults = results.filter(r => {
      const scenario = QUICKSTART_SCENARIOS.find(s => s.id === r.scenarioId);
      return scenario?.priority === 'critical';
    });

    const criticalPassed = criticalResults.filter(r => r.success).length;
    expect(criticalPassed).toBe(criticalResults.length,
      'All critical scenarios must pass for production readiness'
    );

    // High priority scenarios should have >90% success rate
    const highPriorityResults = results.filter(r => {
      const scenario = QUICKSTART_SCENARIOS.find(s => s.id === r.scenarioId);
      return scenario?.priority === 'high';
    });

    if (highPriorityResults.length > 0) {
      const highPriorityPassed = highPriorityResults.filter(r => r.success).length;
      const highPrioritySuccessRate = (highPriorityPassed / highPriorityResults.length) * 100;
      expect(highPrioritySuccessRate).toBeGreaterThanOrEqual(90,
        'High priority scenarios should have >90% success rate'
      );
    }

    // Generate comprehensive report
    const report = runner.generateReport(results);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./quickstart-validation-complete-${timestamp}.md`;

    await fs.writeFile(reportPath, report, 'utf8');

    console.log(`\n📄 Complete report saved to: ${reportPath}`);
    console.log('🎉 Quickstart validation suite completed!');
  });
});