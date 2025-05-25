import { pipeline } from '@xenova/transformers';

export type Emotion = {
  label: string;
  score: number;
};

export class EmotionDetectionService {
  private classifier: any;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      this.classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize emotion detection:', error);
      throw new Error('Emotion detection initialization failed');
    }
  }

  async detectEmotionFromText(text: string): Promise<Emotion[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const results = await this.classifier(text);
      return results.map((result: any) => ({
        label: result.label,
        score: result.score
      }));
    } catch (error) {
      console.error('Emotion detection error:', error);
      throw new Error('Failed to detect emotion from text');
    }
  }

  async detectEmotionFromAudio(audioData: ArrayBuffer): Promise<Emotion[]> {
    // This is a placeholder for audio-based emotion detection
    // In a real implementation, you would:
    // 1. Convert audio to text using SpeechToTextService
    // 2. Analyze the text for emotions
    // 3. Optionally analyze audio features (pitch, tempo, etc.)
    throw new Error('Audio-based emotion detection not implemented yet');
  }

  getDominantEmotion(emotions: Emotion[]): Emotion {
    return emotions.reduce((prev, current) => 
      (current.score > prev.score) ? current : prev
    );
  }
} 