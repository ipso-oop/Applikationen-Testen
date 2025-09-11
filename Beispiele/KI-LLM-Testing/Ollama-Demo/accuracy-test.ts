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

interface AccuracyTestCase {
  name: string;
  input: string;
  expectedOutput: string;
  category: 'factual' | 'mathematical' | 'logical' | 'scientific' | 'historical' | 'geographical';
  difficulty: 'easy' | 'medium' | 'hard';
  exactMatch: boolean; // whether exact match is required or partial is acceptable
}

const accuracyTestCases: AccuracyTestCase[] = [
  // Factual Knowledge
  {
    name: "Capital Cities",
    input: "What is the capital of Japan?",
    expectedOutput: "Tokyo",
    category: "factual",
    difficulty: "easy",
    exactMatch: true
  },
  {
    name: "Chemical Elements",
    input: "What is the atomic number of carbon?",
    expectedOutput: "6",
    category: "factual",
    difficulty: "easy",
    exactMatch: true
  },
  {
    name: "Historical Dates",
    input: "In what year did World War II end?",
    expectedOutput: "1945",
    category: "historical",
    difficulty: "easy",
    exactMatch: true
  },
  
  // Mathematical Problems
  {
    name: "Basic Arithmetic",
    input: "What is 15 × 23?",
    expectedOutput: "345",
    category: "mathematical",
    difficulty: "easy",
    exactMatch: true
  },
  {
    name: "Percentage Calculation",
    input: "What is 25% of 240?",
    expectedOutput: "60",
    category: "mathematical",
    difficulty: "easy",
    exactMatch: true
  },
  {
    name: "Algebraic Equation",
    input: "Solve for x: 3x + 7 = 22",
    expectedOutput: "x = 5",
    category: "mathematical",
    difficulty: "medium",
    exactMatch: false
  },
  {
    name: "Geometry Problem",
    input: "What is the area of a circle with radius 5?",
    expectedOutput: "78.54",
    category: "mathematical",
    difficulty: "medium",
    exactMatch: false
  },
  
  // Scientific Knowledge
  {
    name: "Physics Formula",
    input: "What is the speed of light in vacuum?",
    expectedOutput: "299,792,458 meters per second",
    category: "scientific",
    difficulty: "easy",
    exactMatch: false
  },
  {
    name: "Biology Classification",
    input: "What kingdom do humans belong to?",
    expectedOutput: "Animalia",
    category: "scientific",
    difficulty: "easy",
    exactMatch: true
  },
  {
    name: "Chemistry Reaction",
    input: "What is the chemical formula for water?",
    expectedOutput: "H2O",
    category: "scientific",
    difficulty: "easy",
    exactMatch: true
  },
  
  // Logical Reasoning
  {
    name: "Logical Deduction",
    input: "If all birds have wings and penguins are birds, do penguins have wings?",
    expectedOutput: "Yes, penguins have wings",
    category: "logical",
    difficulty: "easy",
    exactMatch: false
  },
  {
    name: "Pattern Recognition",
    input: "What comes next in the sequence: 2, 4, 8, 16, ?",
    expectedOutput: "32",
    category: "logical",
    difficulty: "medium",
    exactMatch: true
  },
  {
    name: "Complex Logic",
    input: "If A is taller than B, and B is taller than C, who is the shortest?",
    expectedOutput: "C is the shortest",
    category: "logical",
    difficulty: "medium",
    exactMatch: false
  },
  
  // Geographical Knowledge
  {
    name: "Country Capitals",
    input: "What is the capital of Australia?",
    expectedOutput: "Canberra",
    category: "geographical",
    difficulty: "medium",
    exactMatch: true
  },
  {
    name: "Largest Countries",
    input: "What is the largest country by area?",
    expectedOutput: "Russia",
    category: "geographical",
    difficulty: "easy",
    exactMatch: true
  },
  {
    name: "Climate Zones",
    input: "What type of climate does the Amazon rainforest have?",
    expectedOutput: "Tropical rainforest climate",
    category: "geographical",
    difficulty: "medium",
    exactMatch: false
  },
  
  // Historical Knowledge
  {
    name: "Ancient History",
    input: "Who was the first emperor of Rome?",
    expectedOutput: "Augustus",
    category: "historical",
    difficulty: "medium",
    exactMatch: true
  },
  {
    name: "Modern History",
    input: "Who was the first person to walk on the moon?",
    expectedOutput: "Neil Armstrong",
    category: "historical",
    difficulty: "easy",
    exactMatch: true
  },
  {
    name: "Historical Events",
    input: "What year did the Berlin Wall fall?",
    expectedOutput: "1989",
    category: "historical",
    difficulty: "medium",
    exactMatch: true
  }
];

interface AccuracyResult {
  testName: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  category: string;
  difficulty: string;
  accuracy: number;
  exactMatch: boolean;
  partialMatch: boolean;
  containsExpected: boolean;
  latency: number;
  tokenCount: number;
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
        temperature: 0.1, // Lower temperature for more consistent factual responses
        top_p: 0.9,
        max_tokens: 200
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

function calculateAccuracy(actual: string, expected: string, exactMatch: boolean): {
  accuracy: number;
  exactMatch: boolean;
  partialMatch: boolean;
  containsExpected: boolean;
} {
  const actualLower = actual.toLowerCase().trim();
  const expectedLower = expected.toLowerCase().trim();
  
  // Check for exact match
  const exact = actualLower === expectedLower;
  
  // Check if expected answer is contained in actual answer
  const contains = actualLower.includes(expectedLower);
  
  // Check for partial matches (word-level)
  const expectedWords = expectedLower.split(/\s+/);
  const actualWords = actualLower.split(/\s+/);
  const matchingWords = expectedWords.filter(word => 
    actualWords.some(actualWord => 
      actualWord.includes(word) || word.includes(actualWord)
    )
  );
  
  const partial = matchingWords.length > 0 && matchingWords.length / expectedWords.length >= 0.5;
  
  // Calculate accuracy score
  let accuracy = 0;
  if (exact) {
    accuracy = 1.0;
  } else if (contains) {
    accuracy = 0.8;
  } else if (partial) {
    accuracy = 0.6;
  } else if (matchingWords.length > 0) {
    accuracy = 0.3;
  }
  
  return {
    accuracy,
    exactMatch: exact,
    partialMatch: partial,
    containsExpected: contains
  };
}

async function runAccuracyTest(): Promise<AccuracyResult[]> {
  console.log(chalk.blue.bold('\n🎯 Starting Ollama Llama3.2 Accuracy Tests\n'));
  
  const results: AccuracyResult[] = [];
  const spinner = ora('Initializing accuracy testing...').start();
  
  // Check if Ollama is running
  try {
    await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    spinner.succeed('Ollama is running and accessible');
  } catch (error) {
    spinner.fail('Ollama is not running or not accessible');
    console.log(chalk.red('Please make sure Ollama is running on your local machine.'));
    process.exit(1);
  }
  
  console.log(chalk.green(`\n📊 Running ${accuracyTestCases.length} accuracy test cases...\n`));
  
  for (let i = 0; i < accuracyTestCases.length; i++) {
    const testCase = accuracyTestCases[i];
    const progress = `[${i + 1}/${accuracyTestCases.length}]`;
    
    spinner.start(`${progress} Testing: ${testCase.name}`);
    
    try {
      const { response, tokens, latency } = await callOllama(testCase.input);
      
      const accuracyMetrics = calculateAccuracy(response, testCase.expectedOutput, testCase.exactMatch);
      
      const result: AccuracyResult = {
        testName: testCase.name,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: response,
        category: testCase.category,
        difficulty: testCase.difficulty,
        accuracy: accuracyMetrics.accuracy,
        exactMatch: accuracyMetrics.exactMatch,
        partialMatch: accuracyMetrics.partialMatch,
        containsExpected: accuracyMetrics.containsExpected,
        latency,
        tokenCount: tokens,
        timestamp: new Date()
      };
      
      results.push(result);
      
      // Log to Langfuse
      await langfuse.trace({
        name: `accuracy-test-${testCase.category}`,
        input: testCase.input,
        output: response,
        metadata: {
          testName: testCase.name,
          category: testCase.category,
          difficulty: testCase.difficulty,
          expectedOutput: testCase.expectedOutput,
          accuracy: accuracyMetrics.accuracy,
          exactMatch: accuracyMetrics.exactMatch,
          partialMatch: accuracyMetrics.partialMatch,
          containsExpected: accuracyMetrics.containsExpected,
          latency,
          tokenCount: tokens
        }
      });
      
      const status = accuracyMetrics.exactMatch ? 
        chalk.green('✓') : accuracyMetrics.partialMatch ? 
        chalk.yellow('~') : chalk.red('✗');
      
      spinner.succeed(`${progress} ${testCase.name} ${status} (${(accuracyMetrics.accuracy * 100).toFixed(1)}%)`);
      
    } catch (error) {
      spinner.fail(`${progress} ${testCase.name} - ${chalk.red('Failed')}`);
      console.error(chalk.red(`Error: ${error}`));
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

function generateAccuracyReport(results: AccuracyResult[]): void {
  console.log(chalk.blue.bold('\n📈 ACCURACY TEST REPORT\n'));
  
  // Overall statistics
  const totalTests = results.length;
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / totalTests;
  const exactMatches = results.filter(r => r.exactMatch).length;
  const partialMatches = results.filter(r => r.partialMatch && !r.exactMatch).length;
  const failures = results.filter(r => !r.exactMatch && !r.partialMatch).length;
  
  console.log(chalk.yellow('📊 OVERALL ACCURACY:'));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Average Accuracy: ${(avgAccuracy * 100).toFixed(2)}%`);
  console.log(`Exact Matches: ${exactMatches} (${(exactMatches / totalTests * 100).toFixed(1)}%)`);
  console.log(`Partial Matches: ${partialMatches} (${(partialMatches / totalTests * 100).toFixed(1)}%)`);
  console.log(`Failures: ${failures} (${(failures / totalTests * 100).toFixed(1)}%)`);
  
  // Category breakdown
  const categories = [...new Set(results.map(r => r.category))];
  console.log(chalk.yellow('\n📋 CATEGORY BREAKDOWN:'));
  
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const catAvgAccuracy = categoryResults.reduce((sum, r) => sum + r.accuracy, 0) / categoryResults.length;
    const catExactMatches = categoryResults.filter(r => r.exactMatch).length;
    
    console.log(`\n${chalk.cyan(category.toUpperCase())}:`);
    console.log(`  Tests: ${categoryResults.length}`);
    console.log(`  Average Accuracy: ${(catAvgAccuracy * 100).toFixed(2)}%`);
    console.log(`  Exact Matches: ${catExactMatches}/${categoryResults.length}`);
  }
  
  // Difficulty breakdown
  const difficulties = ['easy', 'medium', 'hard'];
  console.log(chalk.yellow('\n📊 DIFFICULTY BREAKDOWN:'));
  
  for (const difficulty of difficulties) {
    const diffResults = results.filter(r => r.difficulty === difficulty);
    if (diffResults.length > 0) {
      const diffAvgAccuracy = diffResults.reduce((sum, r) => sum + r.accuracy, 0) / diffResults.length;
      const diffExactMatches = diffResults.filter(r => r.exactMatch).length;
      
      console.log(`\n${chalk.cyan(difficulty.toUpperCase())}:`);
      console.log(`  Tests: ${diffResults.length}`);
      console.log(`  Average Accuracy: ${(diffAvgAccuracy * 100).toFixed(2)}%`);
      console.log(`  Exact Matches: ${diffExactMatches}/${diffResults.length}`);
    }
  }
  
  // Detailed results table
  console.log(chalk.yellow('\n📋 DETAILED RESULTS:'));
  
  const tableData = [
    ['Test Name', 'Category', 'Difficulty', 'Expected', 'Actual', 'Accuracy', 'Match Type']
  ];
  
  results.forEach(result => {
    const matchType = result.exactMatch ? 'Exact' : result.partialMatch ? 'Partial' : 'None';
    const accuracyColor = result.accuracy >= 0.8 ? 'green' : result.accuracy >= 0.5 ? 'yellow' : 'red';
    
    tableData.push([
      result.testName,
      result.category,
      result.difficulty,
      result.expectedOutput.substring(0, 20) + (result.expectedOutput.length > 20 ? '...' : ''),
      result.actualOutput.substring(0, 20) + (result.actualOutput.length > 20 ? '...' : ''),
      chalk[accuracyColor](`${(result.accuracy * 100).toFixed(1)}%`),
      matchType
    ]);
  });
  
  console.log(table(tableData));
  
  // Failed tests analysis
  const failedTests = results.filter(r => r.accuracy < 0.5);
  if (failedTests.length > 0) {
    console.log(chalk.yellow('\n❌ FAILED TESTS ANALYSIS:'));
    failedTests.forEach(test => {
      console.log(chalk.red(`\n${test.testName}:`));
      console.log(chalk.gray(`Input: ${test.input}`));
      console.log(chalk.green(`Expected: ${test.expectedOutput}`));
      console.log(chalk.red(`Actual: ${test.actualOutput}`));
      console.log(chalk.yellow(`Accuracy: ${(test.accuracy * 100).toFixed(1)}%`));
    });
  }
  
  // Performance insights
  console.log(chalk.yellow('\n💡 PERFORMANCE INSIGHTS:'));
  
  const bestCategory = categories.reduce((best, cat) => {
    const catResults = results.filter(r => r.category === cat);
    const catAccuracy = catResults.reduce((sum, r) => sum + r.accuracy, 0) / catResults.length;
    const bestAccuracy = results.filter(r => r.category === best).reduce((sum, r) => sum + r.accuracy, 0) / results.filter(r => r.category === best).length;
    return catAccuracy > bestAccuracy ? cat : best;
  });
  
  const worstCategory = categories.reduce((worst, cat) => {
    const catResults = results.filter(r => r.category === cat);
    const catAccuracy = catResults.reduce((sum, r) => sum + r.accuracy, 0) / catResults.length;
    const worstAccuracy = results.filter(r => r.category === worst).reduce((sum, r) => sum + r.accuracy, 0) / results.filter(r => r.category === worst).length;
    return catAccuracy < worstAccuracy ? cat : worst;
  });
  
  console.log(`Best performing category: ${chalk.green(bestCategory)}`);
  console.log(`Worst performing category: ${chalk.red(worstCategory)}`);
  
  if (avgAccuracy >= 0.8) {
    console.log(chalk.green('✅ Overall accuracy is excellent!'));
  } else if (avgAccuracy >= 0.6) {
    console.log(chalk.yellow('⚠️  Overall accuracy is good but could be improved.'));
  } else {
    console.log(chalk.red('❌ Overall accuracy needs significant improvement.'));
  }
}

async function main() {
  try {
    await startActiveObservation("ollama-accuracy-test", async (span) => {
      span.update({
        input: "Ollama Llama3.2 Accuracy Testing",
        output: "Accuracy testing completed",
      });
      
      const results = await runAccuracyTest();
      generateAccuracyReport(results);
      
      console.log(chalk.green.bold('\n✅ Accuracy testing completed!'));
      console.log(chalk.blue('📊 Check your Langfuse dashboard for detailed accuracy traces.'));
    });
  } catch (error) {
    console.error(chalk.red('❌ Accuracy testing failed:'), error);
    process.exit(1);
  }
}

main();
