import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class MixtralModel {
  private modelPath: string;
  private isInitialized: boolean = false;

  constructor() {
    // Path to the Mixtral model files
    this.modelPath = process.env.MIXTRAL_MODEL_PATH || path.join(os.homedir(), '.mixtral', 'models');
    
    // Ensure model directory exists
    if (!fs.existsSync(this.modelPath)) {
      fs.mkdirSync(this.modelPath, { recursive: true });
    }
  }

  /**
   * Initialize the Mixtral model
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if model files exist
      const modelFiles = fs.readdirSync(this.modelPath);
      
      if (modelFiles.length === 0) {
        console.log('Mixtral model files not found. Please download the model first.');
        console.log('You can download the model using:');
        console.log('python -m mixtral.download --model-path ' + this.modelPath);
        throw new Error('Mixtral model files not found');
      }

      // Initialize the model
      await execAsync(`python -m mixtral.initialize --model-path ${this.modelPath}`);
      this.isInitialized = true;
      console.log('Mixtral model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mixtral model:', error);
      throw error;
    }
  }

  /**
   * Generate a response using the Mixtral model
   */
  public async generateResponse(
    messages: Message[],
    temperature: number = 0.7,
    maxTokens: number = 500
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create a temporary file for the conversation
      const tempFile = path.join(os.tmpdir(), `mixtral-conversation-${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(messages));

      // Run the Mixtral model
      const { stdout, stderr } = await execAsync(
        `python -m mixtral.generate --model-path ${this.modelPath} --input-file ${tempFile} --temperature ${temperature} --max-tokens ${maxTokens}`
      );

      // Clean up the temporary file
      fs.unlinkSync(tempFile);

      if (stderr) {
        console.error('Mixtral generation error:', stderr);
        throw new Error('Failed to generate response');
      }

      return stdout.trim();
    } catch (error) {
      console.error('Error generating response with Mixtral:', error);
      throw error;
    }
  }
} 