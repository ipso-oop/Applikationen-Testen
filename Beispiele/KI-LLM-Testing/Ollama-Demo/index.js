import 'dotenv/config';
import axios from 'axios';
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  host: process.env.LANGFUSE_HOST
});

async function askOllama(prompt) {
  const trace = langfuse.trace({ name: 'ollama-demo', userId: 'local-user' });
  const span = trace.span({ name: 'ollama-call', input: prompt });

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt: prompt,
      stream: false
    });

    const output = response.data.response;
    span.end({ output });
    trace.end();
    return output;
  } catch (error) {
    span.end({ error: error.message });
    trace.end({ error: error.message });
    throw error;
  }
}

// DEMO-Aufruf
askOllama('Erkläre OOP in einfachen Worten.')
  .then(console.log)
  .catch(console.error);
