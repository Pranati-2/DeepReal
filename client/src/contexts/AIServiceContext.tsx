import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '../components/ui/use-toast';

// Define types for the AI services
export type VoiceProfile = {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
};

export type Emotion = {
  label: string;
  score: number;
};

export type LLMResponse = {
  text: string;
  context: string[];
};

export type AnimationConfig = {
  enhance: boolean;
  still: boolean;
  preprocess: boolean;
  faceDetector: 'retinaface' | 'mediapipe';
  expressionScale: number;
};

// Define the context type
type AIServiceContextType = {
  // Speech to Text
  transcribeAudio: (audioBlob: Blob) => Promise<string>;
  isTranscribing: boolean;
  
  // Emotion Detection
  detectEmotion: (text: string) => Promise<Emotion[]>;
  isDetectingEmotion: boolean;
  
  // LLM
  generateResponse: (prompt: string) => Promise<LLMResponse>;
  isGeneratingResponse: boolean;
  clearContext: () => void;
  
  // Text to Speech
  synthesizeSpeech: (text: string, voiceProfileId?: string) => Promise<Blob>;
  isSynthesizingSpeech: boolean;
  voiceProfiles: VoiceProfile[];
  
  // Deepfake Animation
  generateAnimation: (sourceImage: Blob, audioBlob: Blob, config: AnimationConfig) => Promise<string>;
  isGeneratingAnimation: boolean;
};

// Create the context
const AIServiceContext = createContext<AIServiceContextType | undefined>(undefined);

// Create the provider component
export const AIServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  
  // State for loading indicators
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDetectingEmotion, setIsDetectingEmotion] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isSynthesizingSpeech, setIsSynthesizingSpeech] = useState(false);
  const [isGeneratingAnimation, setIsGeneratingAnimation] = useState(false);
  
  // Mock voice profiles for now
  const [voiceProfiles] = useState<VoiceProfile[]>([
    { id: 'default', name: 'Default Voice', language: 'en', gender: 'female' },
    { id: 'male1', name: 'Male Voice 1', language: 'en', gender: 'male' },
    { id: 'female1', name: 'Female Voice 1', language: 'en', gender: 'female' },
  ]);
  
  // Speech to Text function
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }
      
      const data = await response.json();
      return data.transcription;
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: 'Transcription Error',
        description: 'Failed to transcribe audio. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Emotion Detection function
  const detectEmotion = async (text: string): Promise<Emotion[]> => {
    setIsDetectingEmotion(true);
    try {
      const response = await fetch('/api/ai/emotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to detect emotion');
      }
      
      const data = await response.json();
      return data.emotions;
    } catch (error) {
      console.error('Emotion detection error:', error);
      toast({
        title: 'Emotion Detection Error',
        description: 'Failed to detect emotion. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsDetectingEmotion(false);
    }
  };
  
  // LLM function
  const generateResponse = async (prompt: string): Promise<LLMResponse> => {
    setIsGeneratingResponse(true);
    try {
      const response = await fetch('/api/ai/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate response');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('LLM error:', error);
      toast({
        title: 'Response Generation Error',
        description: 'Failed to generate response. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsGeneratingResponse(false);
    }
  };
  
  // Clear LLM context
  const clearContext = async () => {
    try {
      await fetch('/api/ai/llm/clear', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Clear context error:', error);
    }
  };
  
  // Text to Speech function
  const synthesizeSpeech = async (text: string, voiceProfileId: string = 'default'): Promise<Blob> => {
    setIsSynthesizingSpeech(true);
    try {
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voiceProfileId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to synthesize speech');
      }
      
      return await response.blob();
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        title: 'Speech Synthesis Error',
        description: 'Failed to synthesize speech. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSynthesizingSpeech(false);
    }
  };
  
  // Deepfake Animation function
  const generateAnimation = async (
    sourceImage: Blob,
    audioBlob: Blob,
    config: AnimationConfig
  ): Promise<string> => {
    setIsGeneratingAnimation(true);
    try {
      const formData = new FormData();
      formData.append('sourceImage', sourceImage);
      formData.append('audio', audioBlob);
      formData.append('config', JSON.stringify(config));
      
      const response = await fetch('/api/ai/animation', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate animation');
      }
      
      const data = await response.json();
      return data.videoUrl;
    } catch (error) {
      console.error('Animation error:', error);
      toast({
        title: 'Animation Generation Error',
        description: 'Failed to generate animation. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsGeneratingAnimation(false);
    }
  };
  
  // Provide the context value
  const value = {
    transcribeAudio,
    isTranscribing,
    detectEmotion,
    isDetectingEmotion,
    generateResponse,
    isGeneratingResponse,
    clearContext,
    synthesizeSpeech,
    isSynthesizingSpeech,
    voiceProfiles,
    generateAnimation,
    isGeneratingAnimation,
  };
  
  return (
    <AIServiceContext.Provider value={value}>
      {children}
    </AIServiceContext.Provider>
  );
};

// Create a hook to use the context
export const useAIService = () => {
  const context = useContext(AIServiceContext);
  if (context === undefined) {
    throw new Error('useAIService must be used within an AIServiceProvider');
  }
  return context;
}; 