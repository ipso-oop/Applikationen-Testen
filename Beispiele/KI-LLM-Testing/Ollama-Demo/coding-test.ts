import 'dotenv/config';
import "./instrumentation";
import { startActiveObservation } from "@langfuse/tracing";
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { Langfuse } from 'langfuse';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const LLAMA_MODEL = 'llama3.2:latest';

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY || '',
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});

interface CodingTestCase {
  name: string;
  prompt: string;
  language: 'python' | 'javascript' | 'java' | 'cpp' | 'go' | 'rust';
  category: 'algorithm' | 'data_structure' | 'function' | 'class' | 'debug' | 'optimization';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedElements: string[]; // Key elements that should appear in the code
  testCases?: Array<{ input: any; expectedOutput: any }>;
}

const codingTestCases: CodingTestCase[] = [
  // Python Tests
  {
    name: "Python - Factorial Function",
    prompt: "Write a Python function to calculate the factorial of a number using recursion.",
    language: "python",
    category: "function",
    difficulty: "easy",
    expectedElements: ["def factorial", "recursion", "return", "if n <= 1"],
    testCases: [
      { input: 5, expectedOutput: 120 },
      { input: 0, expectedOutput: 1 },
      { input: 3, expectedOutput: 6 }
    ]
  },
  {
    name: "Python - Binary Search",
    prompt: "Implement a binary search algorithm in Python that returns the index of the target element or -1 if not found.",
    language: "python",
    category: "algorithm",
    difficulty: "medium",
    expectedElements: ["def binary_search", "left", "right", "mid", "while left <= right"],
    testCases: [
      { input: { arr: [1, 2, 3, 4, 5], target: 3 }, expectedOutput: 2 },
      { input: { arr: [1, 2, 3, 4, 5], target: 6 }, expectedOutput: -1 },
      { input: { arr: [1, 3, 5, 7, 9], target: 5 }, expectedOutput: 2 }
    ]
  },
  {
    name: "Python - Linked List Class",
    prompt: "Create a Python class for a singly linked list with methods to insert at the beginning, insert at the end, and display all elements.",
    language: "python",
    category: "class",
    difficulty: "medium",
    expectedElements: ["class LinkedList", "__init__", "insert_at_beginning", "insert_at_end", "display"],
    testCases: []
  },
  {
    name: "Python - Debug Code",
    prompt: "This Python code has a bug: def divide(a, b): return a / b. What's wrong and how would you fix it?",
    language: "python",
    category: "debug",
    difficulty: "easy",
    expectedElements: ["zero division", "exception", "try", "except"],
    testCases: []
  },
  
  // JavaScript Tests
  {
    name: "JavaScript - Array Methods",
    prompt: "Write a JavaScript function that takes an array of numbers and returns a new array with only the even numbers, doubled.",
    language: "javascript",
    category: "function",
    difficulty: "easy",
    expectedElements: ["filter", "map", "function", "return"],
    testCases: [
      { input: [1, 2, 3, 4, 5], expectedOutput: [4, 8] },
      { input: [2, 4, 6, 8], expectedOutput: [4, 8, 12, 16] },
      { input: [1, 3, 5], expectedOutput: [] }
    ]
  },
  {
    name: "JavaScript - Async Function",
    prompt: "Write a JavaScript async function that fetches data from an API and returns the JSON response. Include error handling.",
    language: "javascript",
    category: "function",
    difficulty: "medium",
    expectedElements: ["async", "await", "fetch", "try", "catch", "json()"],
    testCases: []
  },
  {
    name: "JavaScript - Promise Chain",
    prompt: "Create a JavaScript function that chains multiple promises to process user data, validate it, and save it to a database.",
    language: "javascript",
    category: "function",
    difficulty: "hard",
    expectedElements: ["Promise", "then", "catch", "async", "await"],
    testCases: []
  },
  
  // Java Tests
  {
    name: "Java - Bubble Sort",
    prompt: "Implement bubble sort algorithm in Java with a method that sorts an integer array in ascending order.",
    language: "java",
    category: "algorithm",
    difficulty: "medium",
    expectedElements: ["public static", "void", "int[]", "for", "if", "swap"],
    testCases: [
      { input: [64, 34, 25, 12, 22, 11, 90], expectedOutput: [11, 12, 22, 25, 34, 64, 90] },
      { input: [5, 2, 8, 1, 9], expectedOutput: [1, 2, 5, 8, 9] }
    ]
  },
  {
    name: "Java - Exception Handling",
    prompt: "Write a Java method that reads a file and handles FileNotFoundException and IOException properly.",
    language: "java",
    category: "function",
    difficulty: "medium",
    expectedElements: ["try", "catch", "FileNotFoundException", "IOException", "throws"],
    testCases: []
  },
  
  // C++ Tests
  {
    name: "C++ - Stack Implementation",
    prompt: "Implement a stack data structure in C++ using a class with push, pop, and peek methods.",
    language: "cpp",
    category: "class",
    difficulty: "medium",
    expectedElements: ["class Stack", "push", "pop", "peek", "private", "vector"],
    testCases: []
  },
  {
    name: "C++ - Memory Management",
    prompt: "Write a C++ function that dynamically allocates memory for an array, initializes it, and properly deallocates the memory.",
    language: "cpp",
    category: "function",
    difficulty: "hard",
    expectedElements: ["new", "delete[]", "int*", "for loop"],
    testCases: []
  },
  
  // Go Tests
  {
    name: "Go - Goroutines",
    prompt: "Write a Go program that uses goroutines to calculate the sum of squares of numbers from 1 to 100 concurrently.",
    language: "go",
    category: "function",
    difficulty: "hard",
    expectedElements: ["go func", "goroutine", "channel", "range", "sync"],
    testCases: []
  },
  {
    name: "Go - HTTP Server",
    prompt: "Create a simple HTTP server in Go that handles GET requests and returns a JSON response.",
    language: "go",
    category: "function",
    difficulty: "medium",
    expectedElements: ["http.HandleFunc", "ListenAndServe", "json.Marshal", "w.Header().Set"],
    testCases: []
  },
  
  // Rust Tests
  {
    name: "Rust - Ownership",
    prompt: "Write a Rust function that demonstrates ownership by taking ownership of a String and returning a modified version.",
    language: "rust",
    category: "function",
    difficulty: "hard",
    expectedElements: ["fn", "String", "ownership", "&str", "to_string"],
    testCases: []
  },
  {
    name: "Rust - Error Handling",
    prompt: "Write a Rust function that reads a file and uses Result type for proper error handling.",
    language: "rust",
    category: "function",
    difficulty: "medium",
    expectedElements: ["Result", "Ok", "Err", "match", "File::open"],
    testCases: []
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
    testCasePassing: number;
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
        temperature: 0.3, // Lower temperature for more consistent code generation
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
  testCasePassing: number;
  efficiency: number;
  readability: number;
} {
  const responseLower = response.toLowerCase();
  
  // Element coverage (how many expected elements are present)
  const foundElements = testCase.expectedElements.filter(element => 
    responseLower.includes(element.toLowerCase())
  );
  const elementCoverage = testCase.expectedElements.length > 0 ? 
    foundElements.length / testCase.expectedElements.length : 1;
  
  // Basic syntax correctness checks
  let syntaxScore = 0;
  const syntaxChecks = [
    { pattern: /def\s+\w+\s*\(/, weight: 0.2 }, // Function definition
    { pattern: /class\s+\w+/, weight: 0.2 }, // Class definition
    { pattern: /return\s+/, weight: 0.1 }, // Return statement
    { pattern: /if\s+.*:/, weight: 0.1 }, // If statement
    { pattern: /for\s+.*in\s+/, weight: 0.1 }, // For loop
    { pattern: /while\s+.*:/, weight: 0.1 }, // While loop
    { pattern: /try\s*:/, weight: 0.1 }, // Try block
    { pattern: /catch\s*\(/, weight: 0.1 } // Catch block
  ];
  
  for (const check of syntaxChecks) {
    if (check.pattern.test(response)) {
      syntaxScore += check.weight;
    }
  }
  
  // Code quality metrics
  const lines = response.split('\n').filter(line => line.trim().length > 0);
  const commentLines = lines.filter(line => line.trim().startsWith('#') || line.trim().startsWith('//') || line.trim().startsWith('/*'));
  const commentRatio = lines.length > 0 ? commentLines.length / lines.length : 0;
  
  // Check for proper indentation (basic check)
  const indentedLines = lines.filter(line => line.startsWith('    ') || line.startsWith('\t'));
  const indentationRatio = lines.length > 0 ? indentedLines.length / lines.length : 0;
  
  // Variable naming quality (camelCase, snake_case, etc.)
  const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  const variables = response.match(variablePattern) || [];
  const goodVariableNames = variables.filter(v => 
    v.length > 1 && 
    (v.includes('_') || /[a-z][A-Z]/.test(v)) && 
    !v.match(/^[0-9]/)
  );
  const variableQuality = variables.length > 0 ? goodVariableNames.length / variables.length : 0;
  
  const codeQuality = (commentRatio * 0.3 + indentationRatio * 0.3 + variableQuality * 0.4);
  
  // Efficiency metrics (basic checks)
  let efficiencyScore = 0;
  if (response.includes('for') && response.includes('in')) efficiencyScore += 0.3;
  if (response.includes('while')) efficiencyScore += 0.2;
  if (response.includes('if') && response.includes('else')) efficiencyScore += 0.2;
  if (response.includes('return')) efficiencyScore += 0.3;
  
  // Readability metrics
  const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  const longLines = lines.filter(line => line.length > 80).length;
  const readabilityScore = Math.max(0, 1 - (longLines / lines.length) - (avgLineLength / 200));
  
  // Test case passing (simplified - in real implementation, you'd run the code)
  const testCasePassing = testCase.testCases ? 
    (testCase.testCases.length > 0 ? 0.5 : 1) : 1; // Placeholder - would need actual code execution
  
  return {
    codeQuality,
    syntaxCorrectness: Math.min(syntaxScore, 1),
    elementCoverage,
    testCasePassing,
    efficiency: Math.min(efficiencyScore, 1),
    readability: Math.max(readabilityScore, 0)
  };
}

async function runCodingTest(): Promise<CodingResult[]> {
  console.log(chalk.blue.bold('\n💻 Starting Ollama Llama3.2 Coding Tests\n'));
  
  const results: CodingResult[] = [];
  const spinner = ora('Initializing coding testing...').start();
  
  // Check if Ollama is running
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
      
      // Log to Langfuse
      await langfuse.trace({
        name: `coding-test-${testCase.language}-${testCase.category}`,
        input: testCase.prompt,
        output: response,
        metadata: {
          testName: testCase.name,
          language: testCase.language,
          category: testCase.category,
          difficulty: testCase.difficulty,
          expectedElements: testCase.expectedElements,
          metrics: result.metrics
        }
      });
      
      const overallScore = (metrics.codeQuality + metrics.syntaxCorrectness + metrics.elementCoverage + metrics.efficiency + metrics.readability) / 5;
      const status = overallScore >= 0.8 ? 
        chalk.green('✅') : overallScore >= 0.6 ? 
        chalk.yellow('⚠️') : chalk.red('❌');
      
      spinner.succeed(`${progress} ${testCase.name} ${status} (${(overallScore * 100).toFixed(1)}%)`);
      
    } catch (error) {
      spinner.fail(`${progress} ${testCase.name} - ${chalk.red('Failed')}`);
      console.error(chalk.red(`Error: ${error}`));
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

function generateCodingReport(results: CodingResult[]): void {
  console.log(chalk.blue.bold('\n📈 CODING TEST REPORT\n'));
  
  // Overall statistics
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
  
  // Language breakdown
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
  
  // Category breakdown
  const categories = [...new Set(results.map(r => r.category))];
  console.log(chalk.yellow('\n📋 CATEGORY BREAKDOWN:'));
  
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const catAvgQuality = categoryResults.reduce((sum, r) => sum + r.metrics.codeQuality, 0) / categoryResults.length;
    const catAvgCoverage = categoryResults.reduce((sum, r) => sum + r.metrics.elementCoverage, 0) / categoryResults.length;
    
    console.log(`\n${chalk.cyan(category.toUpperCase().replace('_', ' '))}:`);
    console.log(`  Tests: ${categoryResults.length}`);
    console.log(`  Avg Code Quality: ${(catAvgQuality * 100).toFixed(2)}%`);
    console.log(`  Avg Element Coverage: ${(catAvgCoverage * 100).toFixed(2)}%`);
  }
  
  // Detailed results table
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
  
  // Sample code outputs
  console.log(chalk.yellow('\n💻 SAMPLE CODE OUTPUTS:'));
  results.slice(0, 3).forEach((result, index) => {
    console.log(chalk.cyan(`\n${index + 1}. ${result.testName}:`));
    console.log(chalk.gray(`Prompt: ${result.prompt}`));
    console.log(chalk.blue(`Response:\n${result.response.substring(0, 400)}${result.response.length > 400 ? '...' : ''}`));
    console.log(chalk.green(`Quality: ${(result.metrics.codeQuality * 100).toFixed(1)}% | Syntax: ${(result.metrics.syntaxCorrectness * 100).toFixed(1)}%`));
  });
  
  // Coding insights
  console.log(chalk.yellow('\n💡 CODING INSIGHTS:'));
  
  const bestLanguage = languages.reduce((best, lang) => {
    const langResults = results.filter(r => r.language === lang);
    const langScore = langResults.reduce((sum, r) => sum + r.metrics.codeQuality, 0) / langResults.length;
    const bestScore = results.filter(r => r.language === best).reduce((sum, r) => sum + r.metrics.codeQuality, 0) / results.filter(r => r.language === best).length;
    return langScore > bestScore ? lang : best;
  });
  
  const worstLanguage = languages.reduce((worst, lang) => {
    const langResults = results.filter(r => r.language === lang);
    const langScore = langResults.reduce((sum, r) => sum + r.metrics.codeQuality, 0) / langResults.length;
    const worstScore = results.filter(r => r.language === worst).reduce((sum, r) => sum + r.metrics.codeQuality, 0) / results.filter(r => r.language === worst).length;
    return langScore < worstScore ? lang : worst;
  });
  
  console.log(`Best performing language: ${chalk.green(bestLanguage)}`);
  console.log(`Worst performing language: ${chalk.red(worstLanguage)}`);
  
  if (avgCodeQuality >= 0.8) {
    console.log(chalk.green('✅ Model shows excellent code generation capabilities!'));
  } else if (avgCodeQuality >= 0.6) {
    console.log(chalk.yellow('⚠️  Model shows good code generation with room for improvement.'));
  } else {
    console.log(chalk.red('❌ Model needs improvement in code generation capabilities.'));
  }
  
  if (avgSyntaxCorrectness >= 0.8) {
    console.log(chalk.green('✅ Model generates syntactically correct code!'));
  } else if (avgSyntaxCorrectness >= 0.6) {
    console.log(chalk.yellow('⚠️  Model generates mostly correct code with some syntax issues.'));
  } else {
    console.log(chalk.red('❌ Model needs improvement in syntax correctness.'));
  }
}

async function main() {
  try {
    await startActiveObservation("ollama-coding-test", async (span) => {
      span.update({
        input: "Ollama Llama3.2 Coding Testing",
        output: "Coding testing completed",
      });
      
      const results = await runCodingTest();
      generateCodingReport(results);
      
      console.log(chalk.green.bold('\n✅ Coding testing completed!'));
      console.log(chalk.blue('📊 Check your Langfuse dashboard for detailed coding traces.'));
    });
  } catch (error) {
    console.error(chalk.red('❌ Coding testing failed:'), error);
    process.exit(1);
  }
}

main();
