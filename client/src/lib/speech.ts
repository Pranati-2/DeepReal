// This file contains utilities for speech recognition and synthesis using open source alternatives
import nlp from 'compromise';
import nlpSentences from 'compromise-sentences';

// Initialize compromise with the sentences plugin
nlp.extend(nlpSentences);

// Speech recognition utilities
export async function initializeSpeechRecognition(): Promise<SpeechRecognition | null> {
  // Check if the browser supports the Web Speech API
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Speech recognition is not supported in this browser');
    return null;
  }

  // Create a new instance of the speech recognition engine
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Configure speech recognition
  recognition.continuous = true; // Keep listening even after results
  recognition.interimResults = true; // Show interim results
  recognition.lang = 'en-US'; // Default language, can be changed

  return recognition;
}

// Emotion detection from text using compromise
export function detectEmotionFromText(text: string): string {
  // This is a simple rule-based emotion detection
  // In a real implementation, this would use a more sophisticated model
  
  const doc = nlp(text);
  
  // List of emotion keywords and their associated emotions
  const emotionMap: Record<string, string> = {
    // Joy/Happiness
    'happy': 'happy', 'joy': 'happy', 'delighted': 'happy', 'pleased': 'happy',
    'excited': 'happy', 'glad': 'happy', 'thrilled': 'happy', 'cheerful': 'happy',
    
    // Sadness
    'sad': 'sad', 'unhappy': 'sad', 'depressed': 'sad', 'miserable': 'sad',
    'gloomy': 'sad', 'upset': 'sad', 'disappointed': 'sad', 'sorrow': 'sad',
    
    // Anger
    'angry': 'angry', 'furious': 'angry', 'mad': 'angry', 'enraged': 'angry',
    'irritated': 'angry', 'annoyed': 'angry', 'frustrated': 'angry',
    
    // Fear
    'afraid': 'afraid', 'scared': 'afraid', 'frightened': 'afraid', 'terrified': 'afraid',
    'anxious': 'afraid', 'worried': 'afraid', 'nervous': 'afraid',
    
    // Surprise
    'surprised': 'surprised', 'shocked': 'surprised', 'amazed': 'surprised',
    'astonished': 'surprised', 'astounded': 'surprised', 'startled': 'surprised',
    
    // Disgust
    'disgusted': 'disgusted', 'revolted': 'disgusted', 'repulsed': 'disgusted',
    'appalled': 'disgusted', 'horrified': 'disgusted'
  };
  
  // Count occurrences of emotion words
  const emotionCounts: Record<string, number> = {
    'happy': 0,
    'sad': 0,
    'angry': 0,
    'afraid': 0,
    'surprised': 0,
    'disgusted': 0,
    'neutral': 0
  };
  
  // Get all terms (words) in the text
  const terms = doc.terms().out('array') as string[];
  
  // Count emotion occurrences
  terms.forEach(term => {
    const lowercaseTerm = term.toLowerCase();
    if (emotionMap[lowercaseTerm]) {
      emotionCounts[emotionMap[lowercaseTerm]]++;
    }
  });
  
  // Find exclamation marks to boost emotion intensity
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 0) {
    // Boost the most prominent emotion
    const maxEmotion = Object.keys(emotionCounts).reduce((a, b) => 
      emotionCounts[a] > emotionCounts[b] ? a : b
    );
    emotionCounts[maxEmotion] += exclamationCount;
  }
  
  // Find question marks to potentially indicate curiosity/confusion
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 0) {
    emotionCounts['surprised'] += questionCount / 2; // Slightly boost surprise
  }
  
  // Find the most prominent emotion
  let dominantEmotion = 'neutral';
  let maxCount = 0;
  
  for (const emotion in emotionCounts) {
    if (emotionCounts[emotion] > maxCount) {
      maxCount = emotionCounts[emotion];
      dominantEmotion = emotion;
    }
  }
  
  // If no strong emotion is detected, return neutral
  return maxCount > 0 ? dominantEmotion : 'neutral';
}

// Synthesize speech using Web Speech API (as a fallback before implementing Coqui TTS)
export function synthesizeSpeech(text: string, voice: string = 'default'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis is not supported in this browser'));
      return;
    }

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice if specified
    if (voice !== 'default') {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === voice || v.voiceURI === voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Configure utterance
    utterance.rate = 1.0; // Speed
    utterance.pitch = 1.0; // Pitch
    utterance.volume = 1.0; // Volume

    // Set callbacks
    utterance.onend = () => {
      resolve();
    };
    
    utterance.onerror = (event) => {
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };

    // Speak the utterance
    window.speechSynthesis.speak(utterance);
  });
}

// Get available voices for speech synthesis
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) {
    console.error('Speech synthesis is not supported in this browser');
    return [];
  }
  
  return window.speechSynthesis.getVoices();
}

// Sentence segmentation for better handling of long text
export function segmentText(text: string): string[] {
  const doc = nlp(text);
  return doc.sentences().out('array') as string[];
}

// This function will be replaced with Whisper.cpp or Vosk.js in the full implementation
export async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  // Placeholder for audio transcription
  // In a real implementation, this would use Whisper.cpp or Vosk.js
  console.warn('Using placeholder transcription. Replace with Whisper.cpp or Vosk.js in production');
  
  // For now, we'll use a dummy implementation
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      resolve("This is a placeholder transcription. Replace with real speech-to-text implementation.");
    }, 1000);
  });
}

// This function will be replaced with a real LLM like Mixtral in the full implementation
export async function generateResponse(
  prompt: string, 
  context: string,
  emotion: string,
  videoTranscript?: string
): Promise<string> {
  // Placeholder for LLM response generation
  // In a real implementation, this would use Mixtral, OpenBuddy, or MythoMax
  console.warn('Using placeholder response generation. Replace with real LLM in production');
  
  // Simple rule-based response based on detected emotion and some keywords
  const doc = nlp(prompt.toLowerCase());
  
  // Extract key information
  const isQuestion = prompt.includes('?');
  const hasGreeting = doc.match('(hello|hi|hey|greetings)').found;
  const askingAbout = doc.match('(what|who|where|when|why|how) (is|are|was|were) [.]').found;
  
  // Create a basic response based on the input
  let response = '';
  
  if (hasGreeting) {
    if (emotion === 'happy') {
      response = 'Hello there! It\'s great to see you! How can I help you today?';
    } else if (emotion === 'sad' || emotion === 'afraid') {
      response = 'Hi there. I hope you\'re doing okay. Is there something I can help you with?';
    } else {
      response = 'Hello! How can I assist you today?';
    }
  } else if (isQuestion) {
    if (askingAbout && videoTranscript) {
      // If asking about something and we have video content, refer to it
      response = `Based on what I know, ${context}. The video content might provide more context on this topic.`;
    } else {
      response = `That's an interesting question. ${context} Would you like to know more about this topic?`;
    }
  } else {
    // General response
    if (emotion === 'happy') {
      response = `I'm glad to hear that! ${context} Is there anything specific you'd like to discuss?`;
    } else if (emotion === 'sad') {
      response = `I understand how you feel. ${context} Is there anything I can do to help?`;
    } else if (emotion === 'angry') {
      response = `I see this is important to you. ${context} Let's try to address your concerns.`;
    } else {
      response = `I understand. ${context} Would you like to talk more about this?`;
    }
  }
  
  return response;
}