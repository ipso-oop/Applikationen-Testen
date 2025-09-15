import 'dotenv/config';
import "./instrumentation";
import { startActiveObservation } from "@langfuse/tracing";
import chalk from 'chalk';

async function main() {
  console.log(chalk.blue.bold('\n🤖 Ollama Evaluation Suite\n'));
  console.log(chalk.yellow('Available evaluation modules:'));
  console.log('Selected Model: ${process.env.MODELL}');
  console.log(chalk.cyan('1. ollama-evaluation.ts - Comprehensive evaluation suite'));
  console.log(chalk.cyan('2. performance-test.ts - Performance and latency testing'));
  console.log(chalk.cyan('3. accuracy-test.ts - Accuracy and correctness testing'));
  console.log(chalk.cyan('4. creative-test.ts - Creative writing and generation testing'));
  console.log(chalk.cyan('5. coding-test.ts - Programming and code generation testing'));
  
  console.log(chalk.green('\nTo run evaluations:'));
  console.log(chalk.white('npm run evaluate        # Run comprehensive evaluation'));
  console.log(chalk.white('npm run performance     # Run performance tests'));
  console.log(chalk.white('npm run accuracy        # Run accuracy tests'));
  console.log(chalk.white('npm run creative        # Run creative tests'));
  console.log(chalk.white('npm run coding          # Run coding tests'));
  
  await startActiveObservation("ollama-evaluation-suite", async (span) => {
    span.update({
      input: "Ollama Evaluation Suite Initialization",
      output: "Evaluation suite ready for testing",
    });
  });
}

main();