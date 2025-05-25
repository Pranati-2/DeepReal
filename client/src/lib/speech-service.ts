import { detectEmotionFromText } from './speech';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechServiceConfig {
  onTranscript?: (text: string, emotion: string) => void;
  onResponse?: (text: string, emotion: string) => void;
  onError?: (error: string) => void;
}

export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private config: SpeechServiceConfig;
  private isListening: boolean = false;
  private conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = [];

  constructor(config: SpeechServiceConfig) {
    this.config = config;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as new () => SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');

        if (event.results[0].isFinal) {
          this.processTranscript(transcript);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.config.onError?.(`Speech recognition error: ${event.error}`);
      };
    } else {
      this.config.onError?.('Speech recognition not supported in this browser');
    }
  }

  private async processTranscript(transcript: string) {
    try {
      const emotion = await detectEmotionFromText(transcript);
      this.config.onTranscript?.(transcript, emotion);

      // Add user message to conversation history
      this.conversationHistory.push({ role: 'user', content: transcript });

      // Get response from Mixtral
      const response = await this.getMixtralResponse(transcript);
      const responseEmotion = await detectEmotionFromText(response);

      // Add assistant response to conversation history
      this.conversationHistory.push({ role: 'assistant', content: response });

      this.config.onResponse?.(response, responseEmotion);
    } catch (error) {
      this.config.onError?.(`Error processing transcript: ${error}`);
    }
  }

  private async getMixtralResponse(userInput: string): Promise<string> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...this.conversationHistory,
            { role: 'user', content: userInput }
          ],
          model: 'mixtral-8x7b-instruct',
          temperature: 0.7,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Mixtral');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error getting Mixtral response:', error);
      return 'I apologize, but I encountered an error processing your request.';
    }
  }

  public startListening() {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
      this.isListening = true;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public clearHistory() {
    this.conversationHistory = [];
  }
} 