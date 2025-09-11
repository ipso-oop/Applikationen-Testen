import 'dotenv/config';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const LLAMA_MODEL = 'llama3.2:latest';

interface CodingTestCase {
  name: string;
  prompt: string;
  language: 'python' | 'javascript' | 'java' | 'cpp' | 'go' | 'rust';
  category: 'algorithm' | 'data_structure' | 'function' | 'class' | 'debug' | 'optimization';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedElements: string[];
}

const codingTestCases: CodingTestCase[] = [
  {
    name: "Python - Factorial Function",
    prompt: "Write a Python function to calculate the factorial of a number using recursion.",
    language: "python",
    category: "function",
    difficulty: "easy",
    expectedElements: ["def factorial", "recursion", "return", "if n <= 1"]
  },
  {
    name: "Python - Binary Search",
    prompt: "Implement a binary search algorithm in Python that returns the index of the target element or -1 if not found.",
    language: "python",
    category: "algorithm",
    difficulty: "medium",
    expectedElements: ["def binary_search", "left", "right", "mid", "while left <= right"]
  },
  {
    name: "JavaScript - Array Methods",
    prompt: "Write a JavaScript function that takes an array of numbers and returns a new array with only the even numbers, doubled.",
    language: "javascript",
    category: "function",
    difficulty: "easy",
    expectedElements: ["filter", "map", "function", "return"]
  },
  {
    name: "JavaScript - Async Function",
    prompt: "Write a JavaScript async function that fetches data from an API and returns the JSON response. Include error handling.",
    language: "javascript",
    category: "function",
    difficulty: "medium",
    expectedElements: ["async", "await", "fetch", "try", "catch", "json()"]
  },
  {
    name: "Java - Bubble Sort",
    prompt: "Implement bubble sort algorithm in Java with a method that sorts an integer array in ascending order.",
    language: "java",
    category: "algorithm",
    difficulty: "medium",
    expectedElements: ["public static", "void", "int[]", "for", "if", "swap"]
  }
];

interface CodingResult {
  testName: string;
  prompt: string;
  response: string;
  language: string;
  category: string;
  difficulty: string;
  metrics: {
    codeQuality: number;
    syntaxCorrectness: number;
    elementCoverage: number;
    efficiency: number;
    readability: number;
    latency: number;
    tokenCount: number;
  };
  timestamp: Date;
}

async function callOllama(prompt: string): Promise<{ response: string; tokens: number; latency: number }> {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: LLAMA_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 1500
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

function analyzeCodeResponse(response: string, testCase: CodingTestCase): {
  codeQuality: number;
  syntaxCorrectness: number;
  elementCoverage: number;
  efficiency: number;
  readability: number;
} {
  const responseLower = response.toLowerCase();
  
  const foundElements = testCase.expectedElements.filter(element => 
    responseLower.includes(element.toLowerCase())
  );
  const elementCoverage = testCase.expectedElements.length > 0 ? 
    foundElements.length / testCase.expectedElements.length : 1;
  
  let syntaxScore = 0;
  const syntaxChecks = [
    { pattern: /def\s+\w+\s*\(/, weight: 0.2 },
    { pattern: /class\s+\w+/, weight: 0.2 },
    { pattern: /return\s+/, weight: 0.1 },
    { pattern: /if\s+.*:/, weight: 0.1 },
    { pattern: /for\s+.*in\s+/, weight: 0.1 },
    { pattern: /while\s+.*:/, weight: 0.1 },
    { pattern: /try\s*:/, weight: 0.1 },
    { pattern: /catch\s*\(/, weight: 0.1 }
  ];
  
  for (const check of syntaxChecks) {
    if (check.pattern.test(response)) {
      syntaxScore += check.weight;
    }
  }
  
  const lines = response.split('\n').filter(line => line.trim().length > 0);
  const commentLines = lines.filter(line => line.trim().startsWith('#') || line.trim().startsWith('//') || line.trim().startsWith('/*'));
  const commentRatio = lines.length > 0 ? commentLines.length / lines.length : 0;
  
  const indentedLines = lines.filter(line => line.startsWith('    ') || line.startsWith('\t'));
  const indentationRatio = lines.length > 0 ? indentedLines.length / lines.length : 0;
  
  const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  const variables = response.match(variablePattern) || [];
  const goodVariableNames = variables.filter(v => 
    v.length > 1 && 
    (v.includes('_') || /[a-z][A-Z]/.test(v)) && 
    !v.match(/^[0-9]/)
  );
  const variableQuality = variables.length > 0 ? goodVariableNames.length / variables.length : 0;
  
  const codeQuality = (commentRatio * 0.3 + indentationRatio * 0.3 + variableQuality * 0.4);
  
  let efficiencyScore = 0;
  if (response.includes('for') && response.includes('in')) efficiencyScore += 0.3;
  if (response.includes('while')) efficiencyScore += 0.2;
  if (response.includes('if') && response.includes('else')) efficiencyScore += 0.2;
  if (response.includes('return')) efficiencyScore += 0.3;
  
  const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  const longLines = lines.filter(line => line.length > 80).length;
  const readabilityScore = Math.max(0, 1 - (longLines / lines.length) - (avgLineLength / 200));
  
  return {
    codeQuality,
    syntaxCorrectness: Math.min(syntaxScore, 1),
    elementCoverage,
    efficiency: Math.min(efficiencyScore, 1),
    readability: Math.max(readabilityScore, 0)
  };
}

async function runCodingTest(): Promise<CodingResult[]> {
  console.log(chalk.blue.bold('\n💻 Starting Ollama Llama3.2 Coding Tests\n'));
  
  const results: CodingResult[] = [];
  const spinner = ora('Initializing coding testing...').start();
  
  try {
    await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    spinner.succeed('Ollama is running and accessible');
  } catch (error) {
    spinner.fail('Ollama is not running or not accessible');
    console.log(chalk.red('Please make sure Ollama is running on your local machine.'));
    process.exit(1);
  }
  
  console.log(chalk.green(`\n📊 Running ${codingTestCases.length} coding test cases...\n`));
  
  for (let i = 0; i < codingTestCases.length; i++) {
    const testCase = codingTestCases[i];
    const progress = `[${i + 1}/${codingTestCases.length}]`;
    
    spinner.start(`${progress} Testing: ${testCase.name}`);
    
    try {
      const { response, tokens, latency } = await callOllama(testCase.prompt);
      
      const metrics = analyzeCodeResponse(response, testCase);
      
      const result: CodingResult = {
        testName: testCase.name,
        prompt: testCase.prompt,
        response: response,
        language: testCase.language,
        category: testCase.category,
        difficulty: testCase.difficulty,
        metrics: {
          ...metrics,
          latency,
          tokenCount: tokens
        },
        timestamp: new Date()
      };
      
      results.push(result);
      
      const overallScore = (metrics.codeQuality + metrics.syntaxCorrectness + metrics.elementCoverage + metrics.efficiency + metrics.readability) / 5;
      const status = overallScore >= 0.8 ? 
        chalk.green('✅') : overallScore >= 0.6 ? 
        chalk.yellow('⚠️') : chalk.red('❌');
      
      spinner.succeed(`${progress} ${testCase.name} ${status} (${(overallScore * 100).toFixed(1)}%)`);
      
    } catch (error) {
      spinner.fail(`${progress} ${testCase.name} - ${chalk.red('Failed')}`);
      console.error(chalk.red(`Error: ${error}`));
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

function generateCodingReport(results: CodingResult[]): void {
  console.log(chalk.blue.bold('\n📈 CODING TEST REPORT\n'));
  
  const totalTests = results.length;
  const avgCodeQuality = results.reduce((sum, r) => sum + r.metrics.codeQuality, 0) / totalTests;
  const avgSyntaxCorrectness = results.reduce((sum, r) => sum + r.metrics.syntaxCorrectness, 0) / totalTests;
  const avgElementCoverage = results.reduce((sum, r) => sum + r.metrics.elementCoverage, 0) / totalTests;
  const avgEfficiency = results.reduce((sum, r) => sum + r.metrics.efficiency, 0) / totalTests;
  const avgReadability = results.reduce((sum, r) => sum + r.metrics.readability, 0) / totalTests;
  
  console.log(chalk.yellow('📊 OVERALL CODING METRICS:'));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Average Code Quality: ${(avgCodeQuality * 100).toFixed(2)}%`);
  console.log(`Average Syntax Correctness: ${(avgSyntaxCorrectness * 100).toFixed(2)}%`);
  console.log(`Average Element Coverage: ${(avgElementCoverage * 100).toFixed(2)}%`);
  console.log(`Average Efficiency: ${(avgEfficiency * 100).toFixed(2)}%`);
  console.log(`Average Readability: ${(avgReadability * 100).toFixed(2)}%`);
  
  const languages = [...new Set(results.map(r => r.language))];
  console.log(chalk.yellow('\n📋 LANGUAGE BREAKDOWN:'));
  
  for (const language of languages) {
    const languageResults = results.filter(r => r.language === language);
    const langAvgQuality = languageResults.reduce((sum, r) => sum + r.metrics.codeQuality, 0) / languageResults.length;
    const langAvgSyntax = languageResults.reduce((sum, r) => sum + r.metrics.syntaxCorrectness, 0) / languageResults.length;
    
    console.log(`\n${chalk.cyan(language.toUpperCase())}:`);
    console.log(`  Tests: ${languageResults.length}`);
    console.log(`  Avg Code Quality: ${(langAvgQuality * 100).toFixed(2)}%`);
    console.log(`  Avg Syntax Correctness: ${(langAvgSyntax * 100).toFixed(2)}%`);
  }
  
  console.log(chalk.yellow('\n📋 DETAILED RESULTS:'));
  
  const tableData = [
    ['Test Name', 'Language', 'Category', 'Quality', 'Syntax', 'Coverage', 'Efficiency', 'Readability']
  ];
  
  results.forEach(result => {
    const qualityColor = result.metrics.codeQuality >= 0.8 ? 'green' : result.metrics.codeQuality >= 0.6 ? 'yellow' : 'red';
    const syntaxColor = result.metrics.syntaxCorrectness >= 0.8 ? 'green' : result.metrics.syntaxCorrectness >= 0.6 ? 'yellow' : 'red';
    const coverageColor = result.metrics.elementCoverage >= 0.8 ? 'green' : result.metrics.elementCoverage >= 0.6 ? 'yellow' : 'red';
    
    tableData.push([
      result.testName,
      result.language,
      result.category.replace('_', ' '),
      chalk[qualityColor](`${(result.metrics.codeQuality * 100).toFixed(1)}%`),
      chalk[syntaxColor](`${(result.metrics.syntaxCorrectness * 100).toFixed(1)}%`),
      chalk[coverageColor](`${(result.metrics.elementCoverage * 100).toFixed(1)}%`),
      `${(result.metrics.efficiency * 100).toFixed(1)}%`,
      `${(result.metrics.readability * 100).toFixed(1)}%`
    ]);
  });
  
  console.log(table(tableData));
  
  console.log(chalk.yellow('\n💻 SAMPLE CODE OUTPUTS:'));
  results.slice(0, 2).forEach((result, index) => {
    console.log(chalk.cyan(`\n${index + 1}. ${result.testName}:`));
    console.log(chalk.gray(`Prompt: ${result.prompt}`));
    console.log(chalk.blue(`Response:\n${result.response.substring(0, 300)}${result.response.length > 300 ? '...' : ''}`));
    console.log(chalk.green(`Quality: ${(result.metrics.codeQuality * 100).toFixed(1)}% | Syntax: ${(result.metrics.syntaxCorrectness * 100).toFixed(1)}%`));
  });
}

async function main() {
  try {
    const results = await runCodingTest();
    generateCodingReport(results);
    
    console.log(chalk.green.bold('\n✅ Coding testing completed!'));
  } catch (error) {
    console.error(chalk.red('❌ Coding testing failed:'), error);
    process.exit(1);
  }
}

main();
