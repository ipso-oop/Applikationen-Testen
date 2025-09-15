import 'dotenv/config';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const LLAMA_MODEL = process.env.MODELL;

interface PerformanceTest {
  name: string;
  prompt: string;
  expectedMaxLatency: number;
  expectedMinTokens: number;
  iterations: number;
}

const performanceTests: PerformanceTest[] = [
  {
    name: "Short Response Test",
    prompt: "What is 2+2?",
    expectedMaxLatency: 2000,
    expectedMinTokens: 5,
    iterations: 3
  },
  {
    name: "Medium Response Test",
    prompt: "Explain the concept of machine learning in 2-3 sentences.",
    expectedMaxLatency: 5000,
    expectedMinTokens: 20,
    iterations: 2
  },
  {
    name: "Long Response Test",
    prompt: "Write a detailed explanation of how neural networks work, including backpropagation and gradient descent.",
    expectedMaxLatency: 10000,
    expectedMinTokens: 100,
    iterations: 1
  }
];

interface PerformanceResult {
  testName: string;
  iterations: number;
  latencies: number[];
  tokenCounts: number[];
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  avgTokens: number;
  successRate: number;
  throughput: number;
}

async function callOllama(prompt: string): Promise<{ response: string; tokens: number; latency: number }> {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: LLAMA_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000
      }
    });
    
    const latency = Date.now() - startTime;
    const responseText = response.data.response;
    const tokenCount = responseText.split(' ').length;
    
    return {
      response: responseText.trim(),
      tokens: tokenCount,
      latency
    };
  } catch (error) {
    throw new Error(`Ollama API error: ${error}`);
  }
}

async function runPerformanceTest(test: PerformanceTest): Promise<PerformanceResult> {
  const latencies: number[] = [];
  const tokenCounts: number[] = [];
  let successCount = 0;
  
  console.log(chalk.blue(`\n🧪 Running ${test.name} (${test.iterations} iterations)...`));
  
  for (let i = 0; i < test.iterations; i++) {
    const spinner = ora(`Iteration ${i + 1}/${test.iterations}`).start();
    
    try {
      const { latency, tokens } = await callOllama(test.prompt);
      
      latencies.push(latency);
      tokenCounts.push(tokens);
      successCount++;
      
      spinner.succeed(`Iteration ${i + 1} - ${latency}ms, ${tokens} tokens`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      spinner.fail(`Iteration ${i + 1} - Failed`);
      console.error(chalk.red(`Error: ${error}`));
    }
  }
  
  const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const avgTokens = tokenCounts.reduce((sum, tokens) => sum + tokens, 0) / tokenCounts.length;
  const successRate = (successCount / test.iterations) * 100;
  const totalTime = latencies.reduce((sum, lat) => sum + lat, 0);
  const throughput = (successCount / (totalTime / 1000)) * 60;
  
  return {
    testName: test.name,
    iterations: test.iterations,
    latencies,
    tokenCounts,
    avgLatency,
    minLatency,
    maxLatency,
    avgTokens,
    successRate,
    throughput
  };
}

function generatePerformanceReport(results: PerformanceResult[]): void {
  console.log(chalk.blue.bold('\n📈 PERFORMANCE TEST REPORT\n'));
  
  const totalTests = results.length;
  const totalIterations = results.reduce((sum, r) => sum + r.iterations, 0);
  const overallAvgLatency = results.reduce((sum, r) => sum + r.avgLatency, 0) / totalTests;
  const overallAvgTokens = results.reduce((sum, r) => sum + r.avgTokens, 0) / totalTests;
  const overallSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / totalTests;
  const overallThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / totalTests;
  
  console.log(chalk.yellow('📊 OVERALL PERFORMANCE:'));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Total Iterations: ${totalIterations}`);
  console.log(`Average Latency: ${overallAvgLatency.toFixed(2)}ms`);
  console.log(`Average Tokens: ${overallAvgTokens.toFixed(2)}`);
  console.log(`Success Rate: ${overallSuccessRate.toFixed(2)}%`);
  console.log(`Average Throughput: ${overallThroughput.toFixed(2)} requests/min`);
  
  console.log(chalk.yellow('\n📋 DETAILED RESULTS:'));
  
  const tableData = [
    ['Test Name', 'Iterations', 'Avg Latency (ms)', 'Min Latency (ms)', 'Max Latency (ms)', 'Avg Tokens', 'Success Rate (%)', 'Throughput (req/min)']
  ];
  
  results.forEach(result => {
    tableData.push([
      result.testName,
      result.iterations.toString(),
      result.avgLatency.toFixed(2),
      result.minLatency.toString(),
      result.maxLatency.toString(),
      result.avgTokens.toFixed(2),
      result.successRate.toFixed(2),
      result.throughput.toFixed(2)
    ]);
  });
  
  console.log(table(tableData));
  
  console.log(chalk.yellow('\n💡 PERFORMANCE ANALYSIS:'));
  
  results.forEach(result => {
    const latencyVariance = result.latencies.reduce((sum, lat) => sum + Math.pow(lat - result.avgLatency, 2), 0) / result.latencies.length;
    const latencyStdDev = Math.sqrt(latencyVariance);
    
    console.log(chalk.cyan(`\n${result.testName}:`));
    console.log(`  Latency Consistency: ${latencyStdDev < 500 ? 'Good' : latencyStdDev < 1000 ? 'Fair' : 'Poor'} (σ=${latencyStdDev.toFixed(2)}ms)`);
    console.log(`  Performance: ${result.avgLatency < 2000 ? 'Excellent' : result.avgLatency < 5000 ? 'Good' : result.avgLatency < 10000 ? 'Fair' : 'Poor'}`);
    console.log(`  Reliability: ${result.successRate >= 95 ? 'Excellent' : result.successRate >= 90 ? 'Good' : result.successRate >= 80 ? 'Fair' : 'Poor'}`);
  });
}

async function main() {
  try {
    console.log(chalk.blue.bold('\n🚀 Starting Ollama Llama3.2 Performance Tests\n'));
    
    const spinner = ora('Checking Ollama connection...').start();
    try {
      await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
      spinner.succeed('Ollama is running and accessible');
    } catch (error) {
      spinner.fail('Ollama is not running or not accessible');
      console.log(chalk.red('Please make sure Ollama is running on your local machine.'));
      process.exit(1);
    }
    
    const results: PerformanceResult[] = [];
    
    for (const test of performanceTests) {
      const result = await runPerformanceTest(test);
      results.push(result);
    }
    
    generatePerformanceReport(results);
    
    console.log(chalk.green.bold('\n✅ Performance testing completed!'));
  } catch (error) {
    console.error(chalk.red('❌ Performance testing failed:'), error);
    process.exit(1);
  }
}

main();
