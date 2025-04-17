import { Character, Message } from "@shared/schema";
import { generateResponse, detectEmotion, textToSpeech, transcribeSpeech } from "./openai";
import { simulateLipSync, downloadBlob } from "./media";
import { VoiceType, EmotionType, synthesizeSpeech } from './coqui-tts';
import { generateMixtralResponse, detectEmotionWithMixtral } from './mixtral';
import { generateLipSync, LipSyncProfile } from './lipsync';
import { transcribeAudioWithVosk } from './vosk-speech';

// Map character to voice for text-to-speech
export function getVoiceForCharacter(character: Character): VoiceType {
  // Available voice types in Coqui TTS
  // We'll map characters to these voice types
  const voiceMap: Record<string, VoiceType> = {
    "Alex Johnson": "male",
    "Sarah Chen": "female",
    "Raj Patel": "male"
  };
  
  // Use the character's voice type if available, otherwise use the mapping
  const voiceFromMap = voiceMap[character.name] || "default";
  return (character.voiceType || voiceFromMap) as VoiceType;
}

// Get appropriate lip sync profile for a character
export function getLipSyncProfileForCharacter(character: Character): LipSyncProfile {
  // Get the character's lipsync profile, or default to standard
  return (character.lipsyncProfile || 'default') as LipSyncProfile;
}

// Process user input (text or speech) and generate a response using open-source components
export async function processUserInput(
  input: string,
  character: Character,
  conversationHistory: Message[],
  videoElement: HTMLVideoElement
): Promise<{
  userMessage: Message,
  assistantMessage: Message,
  responseVideo: Blob
}> {
  try {
    console.log("Processing user input with open-source stack...");
    
    // 1. Detect emotion in the user's input using Mixtral
    // Fall back to OpenAI if needed for development
    let emotion: string;
    try {
      emotion = await detectEmotionWithMixtral(input);
      console.log("Emotion detected with Mixtral:", emotion);
    } catch (error) {
      console.warn("Mixtral emotion detection failed, falling back to OpenAI:", error);
      emotion = await detectEmotion(input);
    }
    
    // 2. Create user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
      emotion
    };
    
    // 3. Add user message to history for context
    const updatedHistory = [...conversationHistory, userMessage];
    
    // 4. Generate AI response using Mixtral (or fall back to OpenAI/compromise.js)
    let responseText: string;
    try {
      // Convert messages to format expected by Mixtral
      const formattedMessages = updatedHistory.map(message => ({
        role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: message.content
      }));
      
      responseText = await generateMixtralResponse(
        formattedMessages,
        character.contextPrompt || undefined
      );
      console.log("Response generated with Mixtral");
    } catch (error) {
      console.warn("Mixtral response generation failed, falling back to OpenAI:", error);
      responseText = await generateResponse(
        updatedHistory,
        character.contextPrompt || undefined,
        character.name
      );
    }
    
    // 5. Create assistant message and detect its emotion
    let responseEmotion: string;
    try {
      responseEmotion = await detectEmotionWithMixtral(responseText);
    } catch (error) {
      console.warn("Mixtral emotion detection failed, falling back to OpenAI:", error);
      responseEmotion = await detectEmotion(responseText);
    }
    
    const assistantMessage: Message = {
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
      emotion: responseEmotion
    };
    
    // 6. Generate speech from text using Coqui TTS (or fall back to browser's TTS)
    let audioBlob: Blob;
    try {
      const voice = getVoiceForCharacter(character);
      const emotion = responseEmotion as EmotionType;
      audioBlob = await synthesizeSpeech(responseText, voice, emotion);
      console.log("Speech synthesized with Coqui TTS");
    } catch (error) {
      console.warn("Coqui TTS failed, falling back to browser TTS:", error);
      audioBlob = await textToSpeech(responseText, getVoiceForCharacter(character) as string);
    }
    
    // 7. Generate lip-synced video using SadTalker/Wav2Lip approach
    let responseVideo: Blob;
    try {
      // Get video source from the video element
      const videoSrc = videoElement.src;
      const profile = getLipSyncProfileForCharacter(character);
      
      // Generate lip sync with our custom implementation
      responseVideo = await generateLipSync(videoSrc, audioBlob, profile);
      console.log("Lip sync generated with custom implementation");
    } catch (error) {
      console.warn("Custom lip sync failed, falling back to simulation:", error);
      responseVideo = await simulateLipSync(videoElement, audioBlob);
    }
    
    return {
      userMessage,
      assistantMessage,
      responseVideo
    };
  } catch (error) {
    console.error("Error processing user input:", error);
    throw error;
  }
}

// Convert speech to text using Vosk (or fall back to Web Speech API)
export async function speechToText(audioBlob: Blob): Promise<string> {
  try {
    // Try to use Vosk for speech recognition
    try {
      const transcript = await transcribeAudioWithVosk(audioBlob);
      console.log("Speech transcribed with Vosk:", transcript);
      
      if (transcript && transcript.trim()) {
        return transcript;
      } else {
        // If Vosk returns empty result, fall back to OpenAI
        throw new Error("Vosk returned empty transcript");
      }
    } catch (voskError) {
      console.warn("Vosk speech recognition failed, falling back to OpenAI:", voskError);
      return await transcribeSpeech(audioBlob);
    }
  } catch (error) {
    console.error("Speech-to-text failed completely:", error);
    return "I couldn't understand what you said. Could you try again?";
  }
}

// Export a conversation history as text
export function exportConversation(
  character: Character,
  messages: Message[]
): string {
  const title = `Conversation with ${character.name} - ${new Date().toLocaleString()}`;
  
  let conversationText = `${title}\n\n`;
  conversationText += `Context: ${character.contextPrompt || 'None'}\n\n`;
  
  messages.forEach(message => {
    const speaker = message.role === 'user' ? 'You' : character.name;
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    conversationText += `[${timestamp}] ${speaker}: ${message.content}\n\n`;
  });
  
  return conversationText;
}

// Generate a blob for downloading the conversation
export function generateConversationBlob(
  character: Character,
  messages: Message[]
): Blob {
  const text = exportConversation(character, messages);
  return new Blob([text], { type: 'text/plain' });
}

// Re-export downloadBlob from media for backward compatibility
export { downloadBlob } from "./media";
