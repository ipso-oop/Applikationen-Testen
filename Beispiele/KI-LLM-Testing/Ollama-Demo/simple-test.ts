import 'dotenv/config';
import axios from 'axios';
import chalk from 'chalk';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const LLAMA_MODEL = 'llama3.2:latest';

async function testOllama() {
  console.log(chalk.blue.bold('\n🧪 Simple Ollama Test\n'));
  
  try {
    // Test basic connection
    console.log(chalk.yellow('Testing Ollama connection...'));
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    console.log(chalk.green('✅ Ollama is running and accessible'));
    
    // Test Llama3.2 model
    console.log(chalk.yellow('\nTesting Llama3.2 model...'));
    const startTime = Date.now();
    
    const generateResponse = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: LLAMA_MODEL,
      prompt: "What is 2+2?",
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 100
      }
    });
    
    const latency = Date.now() - startTime;
    const responseText = generateResponse.data.response;
    
    console.log(chalk.green('✅ Llama3.2 model is working!'));
    console.log(chalk.blue(`Response: ${responseText}`));
    console.log(chalk.blue(`Latency: ${latency}ms`));
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error);
  }
}

testOllama();
