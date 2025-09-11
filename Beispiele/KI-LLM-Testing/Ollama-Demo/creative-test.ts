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

interface CreativeTestCase {
  name: string;
  prompt: string;
  category: 'story' | 'poetry' | 'dialogue' | 'description' | 'character' | 'worldbuilding';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedElements: string[]; // Key elements that should appear in the response
  minLength: number;
  maxLength: number;
}

const creativeTestCases: CreativeTestCase[] = [
  // Story Writing
  {
    name: "Short Story - Sci-Fi",
    prompt: "Write a short story about a robot who discovers emotions. Include a conflict and resolution.",
    category: "story",
    difficulty: "medium",
    expectedElements: ["robot", "emotions", "conflict", "resolution"],
    minLength: 200,
    maxLength: 500
  },
  {
    name: "Mystery Story",
    prompt: "Write a mystery story about a missing painting in an art gallery. Include clues and a detective.",
    category: "story",
    difficulty: "hard",
    expectedElements: ["mystery", "painting", "art gallery", "clues", "detective"],
    minLength: 300,
    maxLength: 600
  },
  {
    name: "Fantasy Adventure",
    prompt: "Write an adventure story about a young wizard's first quest to find a magical artifact.",
    category: "story",
    difficulty: "medium",
    expectedElements: ["wizard", "quest", "magical artifact", "adventure"],
    minLength: 250,
    maxLength: 500
  },
  
  // Poetry
  {
    name: "Haiku - Nature",
    prompt: "Write a haiku about the ocean waves.",
    category: "poetry",
    difficulty: "easy",
    expectedElements: ["ocean", "waves"],
    minLength: 10,
    maxLength: 50
  },
  {
    name: "Free Verse - Technology",
    prompt: "Write a free verse poem about artificial intelligence and human connection.",
    category: "poetry",
    difficulty: "medium",
    expectedElements: ["artificial intelligence", "human connection"],
    minLength: 100,
    maxLength: 300
  },
  {
    name: "Sonnet - Love",
    prompt: "Write a sonnet about unrequited love.",
    category: "poetry",
    difficulty: "hard",
    expectedElements: ["love", "unrequited"],
    minLength: 100,
    maxLength: 200
  },
  
  // Dialogue
  {
    name: "Character Dialogue",
    prompt: "Write a conversation between a detective and a suspect about a missing person case.",
    category: "dialogue",
    difficulty: "medium",
    expectedElements: ["detective", "suspect", "missing person", "conversation"],
    minLength: 200,
    maxLength: 400
  },
  {
    name: "Comedy Dialogue",
    prompt: "Write a humorous conversation between two friends trying to assemble furniture.",
    category: "dialogue",
    difficulty: "easy",
    expectedElements: ["friends", "furniture", "humor"],
    minLength: 150,
    maxLength: 300
  },
  {
    name: "Dramatic Monologue",
    prompt: "Write a dramatic monologue from a character who just discovered a family secret.",
    category: "dialogue",
    difficulty: "hard",
    expectedElements: ["family secret", "dramatic", "monologue"],
    minLength: 200,
    maxLength: 400
  },
  
  // Description
  {
    name: "Setting Description",
    prompt: "Describe a mysterious forest at twilight with vivid sensory details.",
    category: "description",
    difficulty: "medium",
    expectedElements: ["forest", "twilight", "sensory details"],
    minLength: 150,
    maxLength: 300
  },
  {
    name: "Character Description",
    prompt: "Describe a wise old librarian who has worked in the same library for 50 years.",
    category: "description",
    difficulty: "easy",
    expectedElements: ["librarian", "wise", "old", "library", "50 years"],
    minLength: 100,
    maxLength: 250
  },
  {
    name: "Atmospheric Description",
    prompt: "Describe the atmosphere of a bustling marketplace in a fantasy city.",
    category: "description",
    difficulty: "medium",
    expectedElements: ["marketplace", "bustling", "fantasy city", "atmosphere"],
    minLength: 150,
    maxLength: 300
  },
  
  // Character Development
  {
    name: "Character Backstory",
    prompt: "Create a backstory for a retired superhero who is now a school teacher.",
    category: "character",
    difficulty: "medium",
    expectedElements: ["superhero", "retired", "school teacher", "backstory"],
    minLength: 200,
    maxLength: 400
  },
  {
    name: "Character Motivation",
    prompt: "Describe what drives a young inventor to create machines that help people.",
    category: "character",
    difficulty: "easy",
    expectedElements: ["inventor", "machines", "help people", "motivation"],
    minLength: 150,
    maxLength: 300
  },
  
  // Worldbuilding
  {
    name: "Fantasy World",
    prompt: "Create a detailed description of a magical kingdom with its own unique culture and traditions.",
    category: "worldbuilding",
    difficulty: "hard",
    expectedElements: ["magical kingdom", "culture", "traditions"],
    minLength: 300,
    maxLength: 600
  },
  {
    name: "Future Society",
    prompt: "Describe a futuristic society where humans and AI coexist as equals.",
    category: "worldbuilding",
    difficulty: "medium",
    expectedElements: ["futuristic", "humans", "AI", "coexist", "equals"],
    minLength: 200,
    maxLength: 400
  }
];

interface CreativeResult {
  testName: string;
  prompt: string;
  response: string;
  category: string;
  difficulty: string;
  metrics: {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    vocabularyDiversity: number;
    creativity: number;
    coherence: number;
    elementCoverage: number;
    lengthAppropriate: boolean;
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
        temperature: 0.8, // Higher temperature for more creative responses
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

function analyzeCreativeResponse(response: string, testCase: CreativeTestCase): {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  vocabularyDiversity: number;
  creativity: number;
  coherence: number;
  elementCoverage: number;
  lengthAppropriate: boolean;
} {
  const words = response.split(/\s+/).filter(word => word.length > 0);
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  
  // Vocabulary diversity (unique words / total words)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const vocabularyDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;
  
  // Creativity metrics
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;
  const complexWords = words.filter(word => word.length > 6).length;
  const creativity = (vocabularyDiversity + (avgWordLength / 10) + (complexWords / wordCount)) / 3;
  
  // Coherence (sentence structure and flow)
  const properSentences = sentences.filter(sentence => {
    const trimmed = sentence.trim();
    return trimmed.length > 0 && 
           trimmed[0] === trimmed[0].toUpperCase() && 
           /[.!?]$/.test(trimmed);
  });
  const coherence = sentenceCount > 0 ? properSentences.length / sentenceCount : 0;
  
  // Element coverage (how many expected elements are present)
  const responseLower = response.toLowerCase();
  const foundElements = testCase.expectedElements.filter(element => 
    responseLower.includes(element.toLowerCase())
  );
  const elementCoverage = testCase.expectedElements.length > 0 ? 
    foundElements.length / testCase.expectedElements.length : 1;
  
  // Length appropriateness
  const lengthAppropriate = wordCount >= testCase.minLength && wordCount <= testCase.maxLength;
  
  return {
    wordCount,
    sentenceCount,
    avgSentenceLength,
    vocabularyDiversity,
    creativity,
    coherence,
    elementCoverage,
    lengthAppropriate
  };
}

async function runCreativeTest(): Promise<CreativeResult[]> {
  console.log(chalk.blue.bold('\n🎨 Starting Ollama Llama3.2 Creative Writing Tests\n'));
  
  const results: CreativeResult[] = [];
  const spinner = ora('Initializing creative testing...').start();
  
  // Check if Ollama is running
  try {
    await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    spinner.succeed('Ollama is running and accessible');
  } catch (error) {
    spinner.fail('Ollama is not running or not accessible');
    console.log(chalk.red('Please make sure Ollama is running on your local machine.'));
    process.exit(1);
  }
  
  console.log(chalk.green(`\n📊 Running ${creativeTestCases.length} creative writing test cases...\n`));
  
  for (let i = 0; i < creativeTestCases.length; i++) {
    const testCase = creativeTestCases[i];
    const progress = `[${i + 1}/${creativeTestCases.length}]`;
    
    spinner.start(`${progress} Testing: ${testCase.name}`);
    
    try {
      const { response, tokens, latency } = await callOllama(testCase.prompt);
      
      const metrics = analyzeCreativeResponse(response, testCase);
      
      const result: CreativeResult = {
        testName: testCase.name,
        prompt: testCase.prompt,
        response: response,
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
        name: `creative-test-${testCase.category}`,
        input: testCase.prompt,
        output: response,
        metadata: {
          testName: testCase.name,
          category: testCase.category,
          difficulty: testCase.difficulty,
          expectedElements: testCase.expectedElements,
          metrics: result.metrics
        }
      });
      
      const creativityScore = result.metrics.creativity;
      const status = creativityScore >= 0.7 ? 
        chalk.green('🎨') : creativityScore >= 0.5 ? 
        chalk.yellow('✨') : chalk.red('📝');
      
      spinner.succeed(`${progress} ${testCase.name} ${status} (${(creativityScore * 100).toFixed(1)}% creative)`);
      
    } catch (error) {
      spinner.fail(`${progress} ${testCase.name} - ${chalk.red('Failed')}`);
      console.error(chalk.red(`Error: ${error}`));
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return results;
}

function generateCreativeReport(results: CreativeResult[]): void {
  console.log(chalk.blue.bold('\n📈 CREATIVE WRITING TEST REPORT\n'));
  
  // Overall statistics
  const totalTests = results.length;
  const avgCreativity = results.reduce((sum, r) => sum + r.metrics.creativity, 0) / totalTests;
  const avgCoherence = results.reduce((sum, r) => sum + r.metrics.coherence, 0) / totalTests;
  const avgElementCoverage = results.reduce((sum, r) => sum + r.metrics.elementCoverage, 0) / totalTests;
  const lengthAppropriate = results.filter(r => r.metrics.lengthAppropriate).length;
  const avgWordCount = results.reduce((sum, r) => sum + r.metrics.wordCount, 0) / totalTests;
  
  console.log(chalk.yellow('📊 OVERALL CREATIVITY METRICS:'));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Average Creativity: ${(avgCreativity * 100).toFixed(2)}%`);
  console.log(`Average Coherence: ${(avgCoherence * 100).toFixed(2)}%`);
  console.log(`Average Element Coverage: ${(avgElementCoverage * 100).toFixed(2)}%`);
  console.log(`Length Appropriate: ${lengthAppropriate}/${totalTests} (${(lengthAppropriate/totalTests*100).toFixed(1)}%)`);
  console.log(`Average Word Count: ${avgWordCount.toFixed(0)} words`);
  
  // Category breakdown
  const categories = [...new Set(results.map(r => r.category))];
  console.log(chalk.yellow('\n📋 CATEGORY BREAKDOWN:'));
  
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const catAvgCreativity = categoryResults.reduce((sum, r) => sum + r.metrics.creativity, 0) / categoryResults.length;
    const catAvgCoherence = categoryResults.reduce((sum, r) => sum + r.metrics.coherence, 0) / categoryResults.length;
    const catAvgCoverage = categoryResults.reduce((sum, r) => sum + r.metrics.elementCoverage, 0) / categoryResults.length;
    
    console.log(`\n${chalk.cyan(category.toUpperCase())}:`);
    console.log(`  Tests: ${categoryResults.length}`);
    console.log(`  Avg Creativity: ${(catAvgCreativity * 100).toFixed(2)}%`);
    console.log(`  Avg Coherence: ${(catAvgCoherence * 100).toFixed(2)}%`);
    console.log(`  Avg Element Coverage: ${(catAvgCoverage * 100).toFixed(2)}%`);
  }
  
  // Difficulty breakdown
  const difficulties = ['easy', 'medium', 'hard'];
  console.log(chalk.yellow('\n📊 DIFFICULTY BREAKDOWN:'));
  
  for (const difficulty of difficulties) {
    const diffResults = results.filter(r => r.difficulty === difficulty);
    if (diffResults.length > 0) {
      const diffAvgCreativity = diffResults.reduce((sum, r) => sum + r.metrics.creativity, 0) / diffResults.length;
      const diffAvgCoherence = diffResults.reduce((sum, r) => sum + r.metrics.coherence, 0) / diffResults.length;
      
      console.log(`\n${chalk.cyan(difficulty.toUpperCase())}:`);
      console.log(`  Tests: ${diffResults.length}`);
      console.log(`  Avg Creativity: ${(diffAvgCreativity * 100).toFixed(2)}%`);
      console.log(`  Avg Coherence: ${(diffAvgCoherence * 100).toFixed(2)}%`);
    }
  }
  
  // Detailed results table
  console.log(chalk.yellow('\n📋 DETAILED RESULTS:'));
  
  const tableData = [
    ['Test Name', 'Category', 'Difficulty', 'Creativity', 'Coherence', 'Coverage', 'Words', 'Length OK']
  ];
  
  results.forEach(result => {
    const creativityColor = result.metrics.creativity >= 0.7 ? 'green' : result.metrics.creativity >= 0.5 ? 'yellow' : 'red';
    const coherenceColor = result.metrics.coherence >= 0.8 ? 'green' : result.metrics.coherence >= 0.6 ? 'yellow' : 'red';
    const coverageColor = result.metrics.elementCoverage >= 0.8 ? 'green' : result.metrics.elementCoverage >= 0.6 ? 'yellow' : 'red';
    
    tableData.push([
      result.testName,
      result.category,
      result.difficulty,
      chalk[creativityColor](`${(result.metrics.creativity * 100).toFixed(1)}%`),
      chalk[coherenceColor](`${(result.metrics.coherence * 100).toFixed(1)}%`),
      chalk[coverageColor](`${(result.metrics.elementCoverage * 100).toFixed(1)}%`),
      result.metrics.wordCount.toString(),
      result.metrics.lengthAppropriate ? chalk.green('✓') : chalk.red('✗')
    ]);
  });
  
  console.log(table(tableData));
  
  // Sample creative outputs
  console.log(chalk.yellow('\n💬 SAMPLE CREATIVE OUTPUTS:'));
  results.slice(0, 3).forEach((result, index) => {
    console.log(chalk.cyan(`\n${index + 1}. ${result.testName}:`));
    console.log(chalk.gray(`Prompt: ${result.prompt}`));
    console.log(chalk.blue(`Response: ${result.response.substring(0, 300)}${result.response.length > 300 ? '...' : ''}`));
    console.log(chalk.green(`Creativity: ${(result.metrics.creativity * 100).toFixed(1)}% | Coherence: ${(result.metrics.coherence * 100).toFixed(1)}%`));
  });
  
  // Creative insights
  console.log(chalk.yellow('\n💡 CREATIVE INSIGHTS:'));
  
  const mostCreative = results.reduce((best, current) => 
    current.metrics.creativity > best.metrics.creativity ? current : best
  );
  
  const mostCoherent = results.reduce((best, current) => 
    current.metrics.coherence > best.metrics.coherence ? current : best
  );
  
  console.log(`Most creative response: ${chalk.green(mostCreative.testName)} (${(mostCreative.metrics.creativity * 100).toFixed(1)}%)`);
  console.log(`Most coherent response: ${chalk.green(mostCoherent.testName)} (${(mostCoherent.metrics.coherence * 100).toFixed(1)}%)`);
  
  if (avgCreativity >= 0.7) {
    console.log(chalk.green('✅ Model shows excellent creative capabilities!'));
  } else if (avgCreativity >= 0.5) {
    console.log(chalk.yellow('⚠️  Model shows good creative capabilities with room for improvement.'));
  } else {
    console.log(chalk.red('❌ Model needs improvement in creative writing capabilities.'));
  }
  
  if (avgCoherence >= 0.8) {
    console.log(chalk.green('✅ Model produces highly coherent creative content!'));
  } else if (avgCoherence >= 0.6) {
    console.log(chalk.yellow('⚠️  Model produces reasonably coherent content.'));
  } else {
    console.log(chalk.red('❌ Model needs improvement in content coherence.'));
  }
}

async function main() {
  try {
    await startActiveObservation("ollama-creative-test", async (span) => {
      span.update({
        input: "Ollama Llama3.2 Creative Writing Testing",
        output: "Creative writing testing completed",
      });
      
      const results = await runCreativeTest();
      generateCreativeReport(results);
      
      console.log(chalk.green.bold('\n✅ Creative writing testing completed!'));
      console.log(chalk.blue('📊 Check your Langfuse dashboard for detailed creative traces.'));
    });
  } catch (error) {
    console.error(chalk.red('❌ Creative writing testing failed:'), error);
    process.exit(1);
  }
}

main();
