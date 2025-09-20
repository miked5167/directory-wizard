'use client';

import { Page, Browser } from '@playwright/test';
import {
  QuickstartScenario,
  QuickstartStep,
  QuickstartResult,
  StepResult,
  QUICKSTART_SCENARIOS,
  QUICKSTART_TEST_DATA
} from './QuickstartValidation';

export class QuickstartRunner {
  private page: Page;
  private browser: Browser;
  private baseUrl: string;
  private screenshotDir: string;

  constructor(page: Page, browser: Browser, baseUrl: string = 'http://localhost:3000') {
    this.page = page;
    this.browser = browser;
    this.baseUrl = baseUrl;
    this.screenshotDir = './quickstart-screenshots';
  }

  async runAllScenarios(): Promise<QuickstartResult[]> {
    const results: QuickstartResult[] = [];

    console.log('🚀 Starting Quickstart Validation Scenarios...');
    console.log(`📊 Total scenarios: ${QUICKSTART_SCENARIOS.length}`);

    for (const scenario of QUICKSTART_SCENARIOS) {
      console.log(`\n🔄 Running: ${scenario.name} (${scenario.priority} priority)`);

      const result = await this.runScenario(scenario);
      results.push(result);

      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`${status} ${scenario.name} (${duration}s)`);

      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }

      // Brief pause between scenarios
      await this.page.waitForTimeout(1000);
    }

    this.printSummary(results);
    return results;
  }

  async runScenario(scenario: QuickstartScenario): Promise<QuickstartResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    const screenshots: string[] = [];

    try {
      // Setup test data if needed
      await this.setupTestData();

      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const stepResult = await this.executeStep(step, i, scenario.id);
        stepResults.push(stepResult);

        if (stepResult.screenshot) {
          screenshots.push(stepResult.screenshot);
        }

        if (!stepResult.success) {
          throw new Error(`Step ${i + 1} failed: ${stepResult.error}`);
        }
      }

      return {
        scenarioId: scenario.id,
        success: true,
        duration: Date.now() - startTime,
        screenshots,
        stepResults,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        scenarioId: scenario.id,
        success: false,
        duration: Date.now() - startTime,
        error: errorMessage,
        screenshots,
        stepResults,
      };
    }
  }

  private async executeStep(step: QuickstartStep, index: number, scenarioId: string): Promise<StepResult> {
    const stepStartTime = Date.now();
    let screenshot: string | undefined;

    try {
      switch (step.action) {
        case 'navigate':
          await this.page.goto(this.baseUrl + step.value!);
          break;

        case 'fill':
          await this.page.locator(step.selector!).fill(step.value!);
          break;

        case 'click':
          await this.page.locator(step.selector!).click();
          break;

        case 'select':
          await this.page.locator(step.selector!).selectOption(step.value!);
          break;

        case 'upload':
          await this.handleFileUpload(step);
          break;

        case 'wait':
          if (step.validation) {
            await this.waitForValidation(step.validation, step.timeout || 5000);
          } else {
            await this.page.waitForTimeout(step.timeout || 1000);
          }
          break;

        case 'scroll':
          await this.page.locator(step.selector!).scrollIntoViewIfNeeded();
          break;

        case 'setViewport':
          const [width, height] = step.value!.split('x').map(Number);
          await this.page.setViewportSize({ width, height });
          break;

        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      // Perform validation if specified
      if (step.validation) {
        await this.validateStep(step.validation);
      }

      // Take screenshot if requested
      if (step.screenshot) {
        screenshot = await this.takeScreenshot(scenarioId, index);
      }

      return {
        stepIndex: index,
        action: step.action,
        success: true,
        duration: Date.now() - stepStartTime,
        screenshot,
      };

    } catch (error) {
      // Take screenshot on error for debugging
      screenshot = await this.takeScreenshot(scenarioId, index, 'error');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        stepIndex: index,
        action: step.action,
        success: false,
        duration: Date.now() - stepStartTime,
        error: errorMessage,
        screenshot,
      };
    }
  }

  private async handleFileUpload(step: QuickstartStep): Promise<void> {
    const fileName = step.value!;
    const fileContent = QUICKSTART_TEST_DATA[fileName as keyof typeof QUICKSTART_TEST_DATA];

    if (!fileContent) {
      throw new Error(`Test file not found: ${fileName}`);
    }

    // Create a temporary file
    const fileInput = this.page.locator(step.selector!);

    // Use setInputFiles with buffer content
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: fileName.endsWith('.csv') ? 'text/csv' : 'text/plain',
      buffer: Buffer.from(fileContent),
    });
  }

  private async validateStep(validation: QuickstartStep['validation']): Promise<void> {
    if (!validation) return;

    const { type, target, expected } = validation;

    switch (type) {
      case 'exists':
        const exists = await this.page.locator(target).count() > 0;
        if (!exists) {
          throw new Error(`Element not found: ${target}`);
        }
        break;

      case 'visible':
        await this.page.locator(target).waitFor({ state: 'visible', timeout: 5000 });
        break;

      case 'text':
        await this.page.locator(target).waitFor({ state: 'visible' });
        const text = await this.page.locator(target).textContent();
        if (!text?.includes(expected as string)) {
          throw new Error(`Text validation failed. Expected: ${expected}, Got: ${text}`);
        }
        break;

      case 'value':
        const value = await this.page.locator(target).inputValue();
        if (value !== expected) {
          throw new Error(`Value validation failed. Expected: ${expected}, Got: ${value}`);
        }
        break;

      case 'count':
        const count = await this.page.locator(target).count();
        if (count !== expected) {
          throw new Error(`Count validation failed. Expected: ${expected}, Got: ${count}`);
        }
        break;

      case 'url':
        const url = this.page.url();
        if (!url.includes(expected as string)) {
          throw new Error(`URL validation failed. Expected to contain: ${expected}, Got: ${url}`);
        }
        break;

      default:
        throw new Error(`Unknown validation type: ${type}`);
    }
  }

  private async waitForValidation(validation: QuickstartStep['validation'], timeout: number): Promise<void> {
    if (!validation) return;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await this.validateStep(validation);
        return; // Validation passed
      } catch {
        // Continue waiting
        await this.page.waitForTimeout(100);
      }
    }

    // Final attempt - this will throw if validation fails
    await this.validateStep(validation);
  }

  private async takeScreenshot(scenarioId: string, stepIndex: number, suffix?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${scenarioId}-step-${stepIndex}${suffix ? `-${suffix}` : ''}-${timestamp}.png`;
    const filePath = `${this.screenshotDir}/${fileName}`;

    await this.page.screenshot({
      path: filePath,
      fullPage: true,
    });

    return filePath;
  }

  private async setupTestData(): Promise<void> {
    // Clear any existing session data
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Set up any required test data in localStorage/sessionStorage
    await this.page.evaluate(() => {
      // Add any default test configuration
      localStorage.setItem('quickstart_test_mode', 'true');
    });
  }

  private printSummary(results: QuickstartResult[]): void {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n📋 QUICKSTART VALIDATION SUMMARY');
    console.log('================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`📸 Screenshots: ${results.reduce((sum, r) => sum + r.screenshots.length, 0)}`);

    if (failed > 0) {
      console.log('\n❌ FAILED SCENARIOS:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          const scenario = QUICKSTART_SCENARIOS.find(s => s.id === r.scenarioId);
          console.log(`  • ${scenario?.name}: ${r.error}`);
        });
    }

    // Performance analysis
    console.log('\n⚡ PERFORMANCE ANALYSIS:');
    results.forEach(result => {
      const scenario = QUICKSTART_SCENARIOS.find(s => s.id === result.scenarioId);
      if (scenario) {
        const duration = result.duration / 1000;
        const estimated = scenario.estimatedTime;
        const performance = duration <= estimated ? '🟢' : duration <= estimated * 1.5 ? '🟡' : '🔴';
        console.log(`  ${performance} ${scenario.name}: ${duration.toFixed(2)}s (est. ${estimated}s)`);
      }
    });
  }

  // Generate detailed report
  generateReport(results: QuickstartResult[]): string {
    const timestamp = new Date().toISOString();
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    let report = `# Quickstart Validation Report\n\n`;
    report += `**Generated**: ${timestamp}\n`;
    report += `**Total Scenarios**: ${results.length}\n`;
    report += `**Passed**: ${passed}\n`;
    report += `**Failed**: ${failed}\n`;
    report += `**Success Rate**: ${((passed / results.length) * 100).toFixed(1)}%\n\n`;

    report += `## Scenario Results\n\n`;

    results.forEach(result => {
      const scenario = QUICKSTART_SCENARIOS.find(s => s.id === result.scenarioId);
      if (!scenario) return;

      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      const duration = (result.duration / 1000).toFixed(2);

      report += `### ${scenario.name} ${status}\n\n`;
      report += `- **Priority**: ${scenario.priority}\n`;
      report += `- **Duration**: ${duration}s\n`;
      report += `- **Expected**: ${scenario.estimatedTime}s\n`;
      report += `- **Description**: ${scenario.description}\n`;

      if (!result.success && result.error) {
        report += `- **Error**: ${result.error}\n`;
      }

      if (result.screenshots.length > 0) {
        report += `- **Screenshots**: ${result.screenshots.length}\n`;
      }

      report += `\n`;
    });

    return report;
  }
}

export default QuickstartRunner;