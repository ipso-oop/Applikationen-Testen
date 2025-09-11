# Ollama Llama3.2 Evaluation Suite

A comprehensive evaluation system for testing Ollama Llama3.2 model capabilities with Langfuse tracing integration.

## Prerequisites

1. **Install Ollama**: Download and install from https://ollama.ai/
2. **Pull Llama3.2 Model**: Run `ollama pull llama3.2` in your terminal
3. **Start Ollama Service**: Ensure Ollama is running on localhost:11434
4. **Set up Langfuse** (optional): Create a .env file with your Langfuse credentials

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables (optional)
cp .env.example .env
# Edit .env with your Langfuse credentials
```

## Usage

### Run All Tests (Recommended)
```bash
npm test
```

### Run Individual Test Suites (Simplified - No OpenTelemetry)
```bash
# Basic connection test
npm run test:simple

# Performance and latency testing
npm run test:performance

# Accuracy and correctness testing
npm run test:accuracy

# Creative writing and generation testing
npm run test:creative

# Programming and code generation testing
npm run test:coding
```

### Run Full Evaluation Suites (With Langfuse Integration)
```bash
# Comprehensive evaluation (all test types)
npm run evaluate

# Performance and latency testing
npm run performance

# Accuracy and correctness testing
npm run accuracy

# Creative writing and generation testing
npm run creative

# Programming and code generation testing
npm run coding

# Run all full evaluations
npm run all
```

### Available Test Categories

1. **Comprehensive Evaluation** (`ollama-evaluation.ts`)
   - Q&A tests
   - Reasoning tests
   - Creative writing tests
   - Coding tests
   - Math tests
   - General knowledge tests

2. **Performance Tests** (`performance-test.ts`)
   - Latency measurements
   - Throughput analysis
   - Response time consistency
   - Resource usage monitoring

3. **Accuracy Tests** (`accuracy-test.ts`)
   - Factual knowledge verification
   - Mathematical problem solving
   - Logical reasoning validation
   - Scientific knowledge assessment

4. **Creative Tests** (`creative-test.ts`)
   - Story writing evaluation
   - Poetry generation assessment
   - Dialogue creation testing
   - Character development analysis

5. **Coding Tests** (`coding-test.ts`)
   - Algorithm implementation
   - Code quality assessment
   - Syntax correctness validation
   - Multi-language support testing

## Environment Variables

Create a `.env` file with the following variables (optional for Langfuse integration):

```env
LANGFUSE_SECRET_KEY=your_secret_key
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

## Output

The evaluation suite provides:
- Real-time progress indicators
- Detailed performance metrics
- Category-wise breakdowns
- Sample outputs and analysis
- Comprehensive reports
- Langfuse traces for monitoring

## Troubleshooting

1. **Ollama not running**: Ensure Ollama service is started and accessible
2. **Model not found**: Run `ollama pull llama3.2` to download the model
3. **Connection issues**: Check if Ollama is running on localhost:11434
4. **Memory issues**: Ensure sufficient RAM for model inference

## Features

- ✅ Multi-category evaluation
- ✅ Real-time progress tracking
- ✅ Detailed performance metrics
- ✅ Langfuse integration
- ✅ Comprehensive reporting
- ✅ Error handling and recovery
- ✅ Configurable test parameters
