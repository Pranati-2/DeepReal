/**
 * Coqui TTS Integration
 * This module provides text-to-speech capabilities using Coqui TTS.
 * 
 * Note: This is currently a simulated implementation for development purposes.
 * In production, you would use an actual Coqui TTS model.
 */

// Voice types
export type VoiceType = 'default' | 'male' | 'female' | 'child' | 'elder' | 'robotic';

// Emotion types for voice modulation
export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'afraid' | 'surprised' | 'disgusted';

// Interface for TTS options
export interface TTSOptions {
  text: string;
  voice?: VoiceType;
  emotion?: EmotionType;
  speed?: number;  // 0.5 to 2.0, with 1.0 being normal speed
  pitch?: number;  // 0.5 to 2.0, with 1.0 being normal pitch
}

// Interface for the Coqui TTS service
export interface TTSService {
  synthesize(options: TTSOptions): Promise<Blob>;
  getAvailableVoices(): Promise<VoiceType[]>;
  preloadVoice(voice: VoiceType): Promise<boolean>;
}

/**
 * CoquiTTS provides text-to-speech functionality
 * This is currently a simulated implementation for development
 */
export class CoquiTTS implements TTSService {
  private availableVoices: VoiceType[] = ['default', 'male', 'female', 'child'];
  private preloadedVoices: Set<VoiceType> = new Set(['default']);
  private audioContext: AudioContext | null = null;
  
  constructor() {
    // Initialize audio context when needed
    this.getAudioContext();
  }
  
  /**
   * Synthesize speech from text
   */
  public async synthesize(options: TTSOptions): Promise<Blob> {
    console.log('Synthesizing speech with Coqui TTS...', options);
    
    // For development, simulate a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // If the voice isn't preloaded, preload it
    if (!this.preloadedVoices.has(options.voice || 'default')) {
      await this.preloadVoice(options.voice || 'default');
    }
    
    // In production, this would use the actual Coqui TTS model
    // For now, we'll use the browser's built-in speech synthesis
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(options.text);
        
        // Apply voice settings
        const voices = window.speechSynthesis.getVoices();
        switch (options.voice) {
          case 'male':
            // Find a male voice
            utterance.voice = voices.find(v => v.name.toLowerCase().includes('male')) || null;
            break;
          case 'female':
            // Find a female voice
            utterance.voice = voices.find(v => v.name.toLowerCase().includes('female')) || null;
            break;
          case 'child':
            // Simulate a child voice with higher pitch
            utterance.pitch = 1.4;
            utterance.rate = 1.1;
            break;
          case 'elder':
            // Simulate an elder voice with lower pitch
            utterance.pitch = 0.8;
            utterance.rate = 0.9;
            break;
          case 'robotic':
            // Simulate a robotic voice
            utterance.pitch = 0.5;
            utterance.rate = 1.0;
            break;
          default:
            // Use default voice
            utterance.voice = voices[0] || null;
        }
        
        // Apply emotion
        this.applyEmotionToUtterance(utterance, options.emotion || 'neutral');
        
        // Apply speed and pitch if provided
        if (options.speed) utterance.rate = options.speed;
        if (options.pitch) utterance.pitch = options.pitch;
        
        // We need to capture the speech as audio data for Blob creation
        // For development, we'll create a simple sine wave for demonstration
        const audioContext = this.getAudioContext();
        if (!audioContext) {
          reject(new Error('Could not create AudioContext'));
          return;
        }
        
        // Generate a simple audio waveform
        const sampleRate = audioContext.sampleRate;
        const duration = 1 + options.text.length / 10; // Rough estimation of speech duration
        const audioBuffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Generate a sine wave with variations based on options
        const baseFrequency = options.voice === 'child' ? 440 : 
                           options.voice === 'female' ? 330 : 
                           options.voice === 'male' ? 220 : 
                           options.voice === 'elder' ? 200 : 
                           options.voice === 'robotic' ? 180 : 
                           300; // default
                           
        // Add some variation based on emotion
        const emotionVariation = 
          options.emotion === 'happy' ? 1.1 :
          options.emotion === 'sad' ? 0.9 :
          options.emotion === 'angry' ? 1.2 :
          options.emotion === 'afraid' ? 1.15 :
          options.emotion === 'surprised' ? 1.3 :
          1.0; // neutral or default
        
        // Generate the waveform
        for (let i = 0; i < channelData.length; i++) {
          // Add some variation over time to simulate speech
          const timeVariation = 1 + 0.1 * Math.sin(i / sampleRate * 2);
          
          // Basic sine wave
          channelData[i] = Math.sin(2 * Math.PI * baseFrequency * emotionVariation * timeVariation * i / sampleRate);
          
          // Add some noise for realism
          channelData[i] += (Math.random() * 2 - 1) * 0.05;
          
          // Apply envelope for smooth start and end
          const envelope = 
            i < sampleRate * 0.1 ? i / (sampleRate * 0.1) : // Fade in
            i > channelData.length - sampleRate * 0.1 ? (channelData.length - i) / (sampleRate * 0.1) : // Fade out
            1.0; // Full volume
          
          channelData[i] *= envelope;
        }
        
        // Convert the audio buffer to a Blob
        const audioData = this.audioBufferToWav(audioBuffer);
        const audioBlob = new Blob([audioData], { type: 'audio/wav' });
        
        // Speak the utterance (for development demo)
        window.speechSynthesis.speak(utterance);
        
        // Resolve with the Blob
        resolve(audioBlob);
      } catch (error) {
        console.error('Error synthesizing speech:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Get list of available voices
   */
  public async getAvailableVoices(): Promise<VoiceType[]> {
    // In production, this would fetch available voices from the Coqui TTS model
    return this.availableVoices;
  }
  
  /**
   * Preload a voice for faster synthesis
   */
  public async preloadVoice(voice: VoiceType): Promise<boolean> {
    if (this.preloadedVoices.has(voice)) {
      return true;
    }
    
    console.log(`Preloading voice: ${voice}`);
    
    // Simulate voice loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.preloadedVoices.add(voice);
    return true;
  }
  
  /**
   * Get or create the audio context
   */
  private getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch (error) {
        console.error('Could not create AudioContext:', error);
        return null;
      }
    }
    return this.audioContext;
  }
  
  /**
   * Apply emotion modulation to an utterance
   */
  private applyEmotionToUtterance(utterance: SpeechSynthesisUtterance, emotion: EmotionType): void {
    switch (emotion) {
      case 'happy':
        utterance.pitch = 1.2;
        utterance.rate = 1.1;
        break;
      case 'sad':
        utterance.pitch = 0.8;
        utterance.rate = 0.9;
        break;
      case 'angry':
        utterance.pitch = 1.4;
        utterance.rate = 1.2;
        break;
      case 'afraid':
        utterance.pitch = 1.3;
        utterance.rate = 1.3;
        break;
      case 'surprised':
        utterance.pitch = 1.5;
        utterance.rate = 1.0;
        break;
      case 'disgusted':
        utterance.pitch = 0.7;
        utterance.rate = 0.8;
        break;
      default: // neutral
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
    }
  }
  
  /**
   * Convert an AudioBuffer to a WAV file
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const buffer = audioBuffer.getChannelData(0);
    const samples = buffer.length;
    const dataSize = samples * blockAlign;
    const wavHeaderSize = 44;
    const wavSize = wavHeaderSize + dataSize;
    
    const wavBuffer = new ArrayBuffer(wavSize);
    const view = new DataView(wavBuffer);
    
    // Write WAV header
    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    
    // FMT sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk size
    view.setUint16(20, format, true); // Audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // Byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    
    // Data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write audio data
    const offset = 44;
    const volume = 0.9;
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i])) * volume;
      const sample16bit = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + i * 2, sample16bit, true);
    }
    
    return wavBuffer;
  }
  
  /**
   * Helper to write a string to a DataView
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

// Singleton instance
let ttsService: TTSService | null = null;

/**
 * Get the TTS service instance
 */
export function getTTSService(): TTSService {
  if (!ttsService) {
    ttsService = new CoquiTTS();
  }
  return ttsService;
}

/**
 * Synthesize text to speech
 */
export async function synthesizeSpeech(
  text: string,
  voice: VoiceType = 'default',
  emotion: EmotionType = 'neutral'
): Promise<Blob> {
  const service = getTTSService();
  
  return service.synthesize({
    text,
    voice,
    emotion,
  });
}