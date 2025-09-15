import 'dotenv/config';
import chalk from 'chalk';
import ora from 'ora';

async function runAllTests() {
  console.log(chalk.blue.bold('\n🚀 Running All Ollama Evaluation Tests\n'));
  
  const tests = [
    {
      name: 'Simple Connection Test',
      command: 'npx ts-node simple-test.ts',
      description: 'Basic Ollama connection and model test'
    },
    {
      name: 'Performance Tests',
      command: 'npx ts-node performance-test-simple.ts',
      description: 'Latency and throughput testing'
    },
    {
      name: 'Accuracy Tests',
      command: 'npx ts-node accuracy-test-simple.ts',
      description: 'Factual knowledge and correctness testing'
    },
    {
      name: 'Creative Writing Tests',
      command: 'npx ts-node creative-test-simple.ts',
      description: 'Creative writing and generation testing'
    },
    {
      name: 'Coding Tests',
      command: 'npx ts-node coding-test-simple.ts',
      description: 'Programming and code generation testing'
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const progress = `[${i + 1}/${tests.length}]`;
    
    console.log(chalk.cyan(`\n${progress} Running ${test.name}...`));
    console.log(chalk.gray(`Description: ${test.description}`));
    
    const spinner = ora(`Executing ${test.name}`).start();
    
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout, stderr } = await execAsync(test.command, { 
        cwd: process.cwd(),
        timeout: 300000 // 5 minutes timeout
      });
      
      spinner.succeed(`${progress} ${test.name} - ${chalk.green('PASSED')}`);
      
      results.push({
        name: test.name,
        status: 'PASSED',
        output: stdout,
        error: null
      });
      
    } catch (error: any) {
      spinner.fail(`${progress} ${test.name} - ${chalk.red('FAILED')}`);
      
      results.push({
        name: test.name,
        status: 'FAILED',
        output: null,
        error: error.message
      });
      
      console.error(chalk.red(`Error: ${error.message}`));
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Generate summary report
  console.log(chalk.blue.bold('\n📊 TEST SUMMARY REPORT\n'));
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const total = results.length;
  
  console.log(chalk.yellow('📈 OVERALL RESULTS:'));
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${chalk.green(passed)}`);
  console.log(`Failed: ${chalk.red(failed)}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  console.log(chalk.yellow('\n📋 DETAILED RESULTS:'));
  
  results.forEach(result => {
    const status = result.status === 'PASSED' ? 
      chalk.green('✅ PASSED') : 
      chalk.red('❌ FAILED');
    
    console.log(`\n${chalk.cyan(result.name)}: ${status}`);
    
    if (result.status === 'FAILED' && result.error) {
      console.log(chalk.red(`Error: ${result.error}`));
    }
  });
  
  if (failed === 0) {
    console.log(chalk.green.bold('\n🎉 All tests passed successfully!'));
    console.log(chalk.blue('Your Ollama evaluation suite is working perfectly.'));
  } else {
    console.log(chalk.yellow.bold(`\n⚠️  ${failed} test(s) failed. Please check the errors above.`));
  }
  
  console.log(chalk.blue('\n📝 Available test modules:'));
  console.log(chalk.white('• simple-test.ts - Basic connection test'));
  console.log(chalk.white('• performance-test-simple.ts - Performance testing'));
  console.log(chalk.white('• accuracy-test-simple.ts - Accuracy testing'));
  console.log(chalk.white('• creative-test-simple.ts - Creative writing testing'));
  console.log(chalk.white('• coding-test-simple.ts - Coding testing'));
  
  console.log(chalk.blue('\n🚀 To run individual tests:'));
  console.log(chalk.white('npx ts-node simple-test.ts'));
  console.log(chalk.white('npx ts-node performance-test-simple.ts'));
  console.log(chalk.white('npx ts-node accuracy-test-simple.ts'));
  console.log(chalk.white('npx ts-node creative-test-simple.ts'));
  console.log(chalk.white('npx ts-node coding-test-simple.ts'));
}

runAllTests().catch(error => {
  console.error(chalk.red('❌ Test runner failed:'), error);
  process.exit(1);
});
