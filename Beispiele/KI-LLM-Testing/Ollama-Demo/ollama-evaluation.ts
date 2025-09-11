import 'dotenv/config';
import "./instrumentation";
import { startActiveObservation } from "@langfuse/tracing";
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { Langfuse } from 'langfuse';

// Configuration
const OLLAMA_BASE_URL = 'http://localhost:11434';
const LLAMA_MODEL = 'llama3.2:latest';

// Initialize Langfuse
const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY || '',
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});

// Types
interface EvaluationResult {
  testName: string;
  input: string;
  expectedOutput?: string;
  actualOutput: string;
  metrics: {
    latency: number;
    tokenCount: number;
    accuracy?: number;
    relevance?: number;
    coherence?: number;
    creativity?: number;
  };
  timestamp: Date;
}

interface TestCase {
  name: string;
  input: string;
  expectedOutput?: string;
  category: 'qa' | 'reasoning' | 'creative' | 'coding' | 'math' | 'general';
  difficulty: 'easy' | 'medium' | 'hard';
}

// Test cases for comprehensive evaluation
const testCases: TestCase[] = [
  // Q&A Tests
  {
    name: "Basic Knowledge Q&A",
    input: "What is the capital of France?",
    expectedOutput: "Paris",
    category: "qa",
    difficulty: "easy"
  },
  {
    name: "Historical Knowledge",
    input: "Who wrote 'To Kill a Mockingbird'?",
    expectedOutput: "Harper Lee",
    category: "qa",
    difficulty: "easy"
  },
  {
    name: "Scientific Knowledge",
    input: "What is the chemical symbol for gold?",
    expectedOutput: "Au",
    category: "qa",
    difficulty: "easy"
  },
  
  // Reasoning Tests
  {
    name: "Logical Reasoning",
    input: "If all roses are flowers and some flowers are red, can we conclude that some roses are red?",
    expectedOutput: "No, we cannot conclude that some roses are red based on the given information.",
    category: "reasoning",
    difficulty: "medium"
  },
  {
    name: "Mathematical Reasoning",
    input: "A train travels 300 miles in 4 hours. What is its average speed?",
    expectedOutput: "75 miles per hour",
    category: "reasoning",
    difficulty: "medium"
  },
  {
    name: "Complex Problem Solving",
    input: "You have 12 balls, one of which weighs differently. You have a balance scale and can use it only 3 times. How do you find the different ball?",
    expectedOutput: "Divide into groups of 4, compare two groups, then narrow down systematically.",
    category: "reasoning",
    difficulty: "hard"
  },
  
  // Creative Writing Tests
  {
    name: "Creative Story Writing",
    input: "Write a short story about a robot who discovers emotions.",
    category: "creative",
    difficulty: "medium"
  },
  {
    name: "Poetry Generation",
    input: "Write a haiku about the ocean.",
    category: "creative",
    difficulty: "medium"
  },
  {
    name: "Dialogue Writing",
    input: "Write a conversation between a detective and a suspect about a missing painting.",
    category: "creative",
    difficulty: "hard"
  },
  
  // Coding Tests
  {
    name: "Python Function",
    input: "Write a Python function to find the factorial of a number.",
    expectedOutput: "def factorial(n): return 1 if n <= 1 else n * factorial(n-1)",
    category: "coding",
    difficulty: "easy"
  },
  {
    name: "Algorithm Implementation",
    input: "Implement a binary search algorithm in Python.",
    category: "coding",
    difficulty: "medium"
  },
  {
    name: "Code Debugging",
    input: "This code has a bug: def divide(a, b): return a / b. What's wrong and how to fix it?",
    expectedOutput: "Missing zero division check. Add: if b == 0: raise ValueError('Cannot divide by zero')",
    category: "coding",
    difficulty: "medium"
  },
  
  // Math Tests
  {
    name: "Basic Arithmetic",
    input: "What is 15% of 240?",
    expectedOutput: "36",
    category: "math",
    difficulty: "easy"
  },
  {
    name: "Algebra",
    input: "Solve for x: 2x + 5 = 13",
    expectedOutput: "x = 4",
    category: "math",
    difficulty: "easy"
  },
  {
    name: "Geometry",
    input: "What is the area of a circle with radius 7?",
    expectedOutput: "153.94 square units (or 49π)",
    category: "math",
    difficulty: "medium"
  },
  
  // General Knowledge
  {
    name: "Current Events",
    input: "What are the main causes of climate change?",
    category: "general",
    difficulty: "medium"
  },
  {
    name: "Technology",
    input: "Explain the difference between machine learning and artificial intelligence.",
    category: "general",
    difficulty: "medium"
  },
  {
    name: "Philosophy",
    input: "What is the difference between ethics and morality?",
    category: "general",
    difficulty: "hard"
  }
];

// Ollama API functions
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
    const tokenCount = responseText.split(' ').length; // Approximate token count
    
    return {
      response: responseText.trim(),
      tokens: tokenCount,
      latency
    };
  } catch (error) {
    throw new Error(`Ollama API error: ${error}`);
  }
}

// Evaluation metrics
function calculateAccuracy(actual: string, expected: string): number {
  const actualLower = actual.toLowerCase().trim();
  const expectedLower = expected.toLowerCase().trim();
  
  if (actualLower === expectedLower) return 1.0;
  
  // Check if expected answer is contained in actual answer
  if (actualLower.includes(expectedLower)) return 0.8;
  
  // Check for partial matches
  const expectedWords = expectedLower.split(' ');
  const actualWords = actualLower.split(' ');
  const matchingWords = expectedWords.filter(word => 
    actualWords.some(actualWord => actualWord.includes(word) || word.includes(actualWord))
  );
  
  return matchingWords.length / expectedWords.length;
}

function calculateRelevance(input: string, output: string): number {
  // Simple relevance check - in a real implementation, you'd use more sophisticated NLP
  const inputWords = input.toLowerCase().split(' ');
  const outputWords = output.toLowerCase().split(' ');
  
  const relevantWords = inputWords.filter(word => 
    outputWords.some(outputWord => outputWord.includes(word))
  );
  
  return relevantWords.length / inputWords.length;
}

function calculateCoherence(output: string): number {
  // Simple coherence check based on sentence structure
  const sentences = output.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  
  // Check for proper sentence structure (starts with capital, ends with punctuation)
  const properSentences = sentences.filter(sentence => {
    const trimmed = sentence.trim();
    return trimmed.length > 0 && 
           trimmed[0] === trimmed[0].toUpperCase() && 
           /[.!?]$/.test(trimmed);
  });
  
  return properSentences.length / sentences.length;
}

function calculateCreativity(output: string): number {
  // Simple creativity metric based on vocabulary diversity and length
  const words = output.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  // Higher diversity and longer words suggest more creativity
  const diversity = uniqueWords.size / words.length;
  const lengthScore = Math.min(avgWordLength / 6, 1); // Normalize to 0-1
  
  return (diversity + lengthScore) / 2;
}

// Main evaluation function
async function evaluateModel(): Promise<EvaluationResult[]> {
  console.log(chalk.blue.bold('\n🚀 Starting Ollama Llama3.2 Evaluation\n'));
  
  const results: EvaluationResult[] = [];
  const spinner = ora('Initializing evaluation...').start();
  
  // Check if Ollama is running
  try {
    await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    spinner.succeed('Ollama is running and accessible');
  } catch (error) {
    spinner.fail('Ollama is not running or not accessible');
    console.log(chalk.red('Please make sure Ollama is running on your local machine:'));
    console.log(chalk.yellow('1. Install Ollama: https://ollama.ai/'));
    console.log(chalk.yellow('2. Pull Mistral model: ollama pull mistral'));
    console.log(chalk.yellow('3. Start Ollama service'));
    process.exit(1);
  }
  
  console.log(chalk.green(`\n📊 Running ${testCases.length} test cases across different categories...\n`));
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const progress = `[${i + 1}/${testCases.length}]`;
    
    spinner.start(`${progress} Testing: ${testCase.name}`);
    
    try {
      const { response, tokens, latency } = await callOllama(testCase.input);
      
      const metrics = {
        latency,
        tokenCount: tokens,
        accuracy: testCase.expectedOutput ? calculateAccuracy(response, testCase.expectedOutput) : undefined,
        relevance: calculateRelevance(testCase.input, response),
        coherence: calculateCoherence(response),
        creativity: testCase.category === 'creative' ? calculateCreativity(response) : undefined
      };
      
      const result: EvaluationResult = {
        testName: testCase.name,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: response,
        metrics,
        timestamp: new Date()
      };
      
      results.push(result);
      
      // Log to Langfuse
      await langfuse.trace({
        name: `llama3.2-evaluation-${testCase.category}`,
        input: testCase.input,
        output: response,
        metadata: {
          testName: testCase.name,
          category: testCase.category,
          difficulty: testCase.difficulty,
          metrics: metrics
        }
      });
      
      spinner.succeed(`${progress} ${testCase.name} - ${chalk.green(`${latency}ms`)}`);
      
    } catch (error) {
      spinner.fail(`${progress} ${testCase.name} - ${chalk.red('Failed')}`);
      console.error(chalk.red(`Error: ${error}`));
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Generate evaluation report
function generateReport(results: EvaluationResult[]): void {
  console.log(chalk.blue.bold('\n📈 EVALUATION REPORT\n'));
  
  // Overall statistics
  const totalTests = results.length;
  const avgLatency = results.reduce((sum, r) => sum + r.metrics.latency, 0) / totalTests;
  const avgTokens = results.reduce((sum, r) => sum + r.metrics.tokenCount, 0) / totalTests;
  const avgAccuracy = results.filter(r => r.metrics.accuracy !== undefined)
    .reduce((sum, r) => sum + (r.metrics.accuracy || 0), 0) / results.filter(r => r.metrics.accuracy !== undefined).length;
  const avgRelevance = results.reduce((sum, r) => sum + r.metrics.relevance, 0) / totalTests;
  const avgCoherence = results.reduce((sum, r) => sum + r.metrics.coherence, 0) / totalTests;
  
  console.log(chalk.yellow('📊 OVERALL STATISTICS:'));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`Average Tokens: ${avgTokens.toFixed(2)}`);
  console.log(`Average Accuracy: ${(avgAccuracy * 100).toFixed(2)}%`);
  console.log(`Average Relevance: ${(avgRelevance * 100).toFixed(2)}%`);
  console.log(`Average Coherence: ${(avgCoherence * 100).toFixed(2)}%`);
  
  // Category breakdown
  const categories = [...new Set(testCases.map(tc => tc.category))];
  console.log(chalk.yellow('\n📋 CATEGORY BREAKDOWN:'));
  
  for (const category of categories) {
    const categoryResults = results.filter(r => 
      testCases.find(tc => tc.name === r.testName)?.category === category
    );
    
    if (categoryResults.length > 0) {
      const catAvgLatency = categoryResults.reduce((sum, r) => sum + r.metrics.latency, 0) / categoryResults.length;
      const catAvgAccuracy = categoryResults.filter(r => r.metrics.accuracy !== undefined)
        .reduce((sum, r) => sum + (r.metrics.accuracy || 0), 0) / categoryResults.filter(r => r.metrics.accuracy !== undefined).length;
      
      console.log(`\n${chalk.cyan(category.toUpperCase())}:`);
      console.log(`  Tests: ${categoryResults.length}`);
      console.log(`  Avg Latency: ${catAvgLatency.toFixed(2)}ms`);
      console.log(`  Avg Accuracy: ${(catAvgAccuracy * 100).toFixed(2)}%`);
    }
  }
  
  // Detailed results table
  console.log(chalk.yellow('\n📋 DETAILED RESULTS:'));
  
  const tableData = [
    ['Test Name', 'Category', 'Latency (ms)', 'Tokens', 'Accuracy', 'Relevance', 'Coherence']
  ];
  
  results.forEach(result => {
    const testCase = testCases.find(tc => tc.name === result.testName);
    tableData.push([
      result.testName,
      testCase?.category || 'unknown',
      result.metrics.latency.toString(),
      result.metrics.tokenCount.toString(),
      result.metrics.accuracy ? `${(result.metrics.accuracy * 100).toFixed(1)}%` : 'N/A',
      `${(result.metrics.relevance * 100).toFixed(1)}%`,
      `${(result.metrics.coherence * 100).toFixed(1)}%`
    ]);
  });
  
  console.log(table(tableData));
  
  // Sample outputs
  console.log(chalk.yellow('\n💬 SAMPLE OUTPUTS:'));
  results.slice(0, 3).forEach((result, index) => {
    console.log(chalk.cyan(`\n${index + 1}. ${result.testName}:`));
    console.log(chalk.gray(`Input: ${result.input}`));
    if (result.expectedOutput) {
      console.log(chalk.green(`Expected: ${result.expectedOutput}`));
    }
    console.log(chalk.blue(`Output: ${result.actualOutput.substring(0, 200)}${result.actualOutput.length > 200 ? '...' : ''}`));
  });
}

// Main execution
async function main() {
  try {
    await startActiveObservation("ollama-llama3.2-evaluation", async (span) => {
      span.update({
        input: "Comprehensive Ollama Llama3.2 Model Evaluation",
        output: "Evaluation completed successfully",
      });
      
      const results = await evaluateModel();
      generateReport(results);
      
      console.log(chalk.green.bold('\n✅ Evaluation completed successfully!'));
      console.log(chalk.blue('📊 Check your Langfuse dashboard for detailed traces and metrics.'));
    });
  } catch (error) {
    console.error(chalk.red('❌ Evaluation failed:'), error);
    process.exit(1);
  }
}

main();
