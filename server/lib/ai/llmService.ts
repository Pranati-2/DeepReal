import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
// @ts-ignore
import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';

const execAsync = promisify(exec);

export type LLMResponse = {
  text: string;
  context: string[];
};

export class LLMService {
  private modelPath: string;
  private contextWindow: number = 4096;
  private contextHistory: string[] = [];
  private model: LlamaModel | null = null;
  private context: LlamaContext | null = null;
  private session: LlamaChatSession | null = null;

  constructor() {
    this.modelPath = process.env.MIXTRAL_MODEL_PATH || path.join(process.cwd(), 'models', 'mixtral-8x7b-instruct-v0.1.Q4_K_M.gguf');
    this.initializeModel().catch(err => {
      console.error('Failed to initialize LLM model:', err);
    });
  }

  private async initializeModel() {
    try {
      // Check if model file exists
      await fs.access(this.modelPath);
      
      // Initialize the model
      this.model = new LlamaModel({
        modelPath: this.modelPath,
        contextSize: this.contextWindow,
        gpuLayers: 0 // CPU only for now
      });
      
      // Create a context
      this.context = new LlamaContext({ model: this.model });
      
      // Create a chat session
      this.session = new LlamaChatSession({
        context: this.context,
        systemPrompt: "You are a helpful AI assistant."
      });
      
      console.log('LLM model initialized successfully');
    } catch (error) {
      console.error('Error initializing LLM model:', error);
      throw new Error('Failed to initialize LLM model');
    }
  }

  async generateResponse(prompt: string, maxTokens: number = 2048): Promise<LLMResponse> {
    try {
      // Check if model is initialized
      if (!this.model || !this.context || !this.session) {
        await this.initializeModel();
        if (!this.model || !this.context || !this.session) {
          throw new Error('LLM model not initialized');
        }
      }
      
      // Generate response using the chat session
      const response = await this.session.prompt(prompt, {
        maxTokens,
        temperature: 0.7,
        repeatPenalty: 1.1
      });
      
      // Update context history
      this.updateContext(prompt, response);
      
      return {
        text: response,
        context: this.contextHistory
      };
    } catch (error) {
      console.error('LLM service error:', error);
      
      // Fallback to a simple response if the model fails
      const fallbackResponse = "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
      
      this.updateContext(prompt, fallbackResponse);
      
      return {
        text: fallbackResponse,
        context: this.contextHistory
      };
    }
  }

  private prepareContext(): string {
    // Combine recent context history, respecting the context window
    let combinedContext = '';
    for (const entry of this.contextHistory.reverse()) {
      if ((combinedContext + entry).length > this.contextWindow) {
        break;
      }
      combinedContext = entry + '\n' + combinedContext;
    }
    return combinedContext.trim();
  }

  private updateContext(prompt: string, response: string) {
    // Add new interaction to context history
    this.contextHistory.push(`User: ${prompt}`);
    this.contextHistory.push(`Assistant: ${response}`);

    // Keep context history within limits
    while (this.contextHistory.length > 10) {
      this.contextHistory.shift();
    }
  }

  clearContext() {
    this.contextHistory = [];
    
    // Reinitialize the session with a fresh context
    if (this.model && this.context) {
      this.session = new LlamaChatSession({
        context: this.context,
        systemPrompt: "You are a helpful AI assistant."
      });
    }
  }
} 