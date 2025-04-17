import { Message } from "@shared/schema";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Check if we have a valid API key
const hasValidApiKey = Boolean(OPENAI_API_KEY);

// Basic fetch function for OpenAI API calls
async function fetchOpenAI(endpoint: string, payload: any) {
  if (!hasValidApiKey) {
    throw new Error("OpenAI API key is missing");
  }

  const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(error?.error?.message || "Failed to call OpenAI API");
  }

  return response.json();
}

// Speech to text using OpenAI Whisper API
export async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }
    
    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error('Speech transcription error:', error);
    throw error;
  }
}

// Detect emotion from text
export async function detectEmotion(text: string): Promise<string> {
  try {
    const prompt = `
      Analyze the following text and determine the primary emotion being expressed. 
      Choose only one of: happy, sad, angry, surprised, neutral, excited, curious, confused, or friendly.
      Output only the emotion name.
      
      Text: "${text}"
    `;
    
    const response = await fetchOpenAI('chat/completions', {
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 10,
      temperature: 0.3
    });
    
    // Extract and clean the emotion
    let emotion = response.choices[0].message.content.trim().toLowerCase();
    
    // Normalize emotion to one of the expected values
    const validEmotions = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'excited', 'curious', 'confused', 'friendly'];
    if (!validEmotions.includes(emotion)) {
      emotion = 'neutral'; // Default to neutral if we get an unexpected value
    }
    
    return emotion;
  } catch (error) {
    console.error('Emotion detection error:', error);
    return 'neutral'; // Fallback to neutral on error
  }
}

// Generate response using OpenAI ChatGPT
export async function generateResponse(
  messages: Message[], 
  contextPrompt?: string,
  characterName?: string
): Promise<string> {
  try {
    // Create system prompt based on character and context
    const systemPrompt = `
      You are ${characterName || 'an AI assistant'}.
      ${contextPrompt ? `Context: ${contextPrompt}` : ''}
      Respond naturally and conversationally, as if you're in a video call.
      Keep responses concise (under 100 words) but informative.
    `;
    
    // Format messages for OpenAI API
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(msg => ({ 
        role: msg.role, 
        content: msg.content 
      }))
    ];
    
    const response = await fetchOpenAI('chat/completions', {
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: formattedMessages,
      max_tokens: 300,
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Response generation error:', error);
    throw error;
  }
}

// Text to speech using OpenAI TTS API
export async function textToSpeech(text: string, voice: string = 'nova'): Promise<ArrayBuffer> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        response_format: 'mp3'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Text to speech error:', error);
    throw error;
  }
}

// Fallback methods for when OpenAI API key is not available

// Fallback speech-to-text using Web Speech API
export async function fallbackSpeechToText(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!('webkitSpeechRecognition' in window)) {
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }
    
    // @ts-ignore - SpeechRecognition is not in the TypeScript lib
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      resolve(transcript);
    };
    
    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };
    
    recognition.start();
  });
}

// Fallback text-to-speech using Web Speech API
export function fallbackTextToSpeech(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported in this browser'));
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);
    
    window.speechSynthesis.speak(utterance);
  });
}
