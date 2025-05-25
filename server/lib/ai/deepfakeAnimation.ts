import path from 'path';
import fs from 'fs/promises';
// @ts-ignore
import { Wav2Lip } from 'node-wav2lip';

export type AnimationConfig = {
  fps: number;
  faceDetectorConfidence: number;
  enhanceQuality: boolean;
};

export class DeepfakeAnimationService {
  private modelPath: string;
  private wav2lip: Wav2Lip | null = null;

  constructor() {
    this.modelPath = process.env.WAV2LIP_MODEL_PATH || path.join(process.cwd(), 'models', 'wav2lip_gan.pth');
    this.initializeModel().catch(err => {
      console.error('Failed to initialize Wav2Lip model:', err);
    });
  }

  private async initializeModel() {
    try {
      // Check if model file exists
      await fs.access(this.modelPath);
      
      // Initialize Wav2Lip
      this.wav2lip = new Wav2Lip({
        modelPath: this.modelPath,
        device: 'cpu' // Use CPU for now
      });
      
      console.log('Wav2Lip model initialized successfully');
    } catch (error) {
      console.error('Error initializing Wav2Lip model:', error);
      throw new Error('Failed to initialize Wav2Lip model');
    }
  }

  async generateAnimation(
    sourceImagePath: string,
    audioPath: string,
    outputPath: string,
    config: Partial<AnimationConfig> = {}
  ): Promise<string> {
    try {
      // Check if model is initialized
      if (!this.wav2lip) {
        await this.initializeModel();
        if (!this.wav2lip) {
          throw new Error('Wav2Lip model not initialized');
        }
      }

      // Set default configuration
      const finalConfig: AnimationConfig = {
        fps: config.fps || 25,
        faceDetectorConfidence: config.faceDetectorConfidence || 0.5,
        enhanceQuality: config.enhanceQuality || false
      };

      // Generate animation
      await this.wav2lip.generate({
        sourceImage: sourceImagePath,
        audioFile: audioPath,
        outputPath: outputPath,
        fps: finalConfig.fps,
        faceDetectorConfidence: finalConfig.faceDetectorConfidence,
        enhanceQuality: finalConfig.enhanceQuality
      });

      return outputPath;
    } catch (error) {
      console.error('Deepfake animation error:', error);
      throw new Error('Failed to generate animation');
    }
  }
} 