import { Character, Message } from "@shared/schema";
import { generateResponse, detectEmotion, textToSpeech, transcribeSpeech } from "./openai";
import { simulateLipSync, downloadBlob } from "./media";

// Map character to voice for text-to-speech
export function getVoiceForCharacter(character: Character): string {
  // Available browser speech synthesis voices vary by system
  // We'll map characters to generic voice types
  const voiceMap: Record<string, string> = {
    "Alex Johnson": "male",
    "Sarah Chen": "female",
    "Raj Patel": "male"
  };
  
  return voiceMap[character.name || "default"];
}

// Process user input (text or speech) and generate a response
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
    // 1. Detect emotion in the user's input
    const emotion = await detectEmotion(input);
    
    // 2. Create user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
      emotion
    };
    
    // 3. Add user message to history for context
    const updatedHistory = [...conversationHistory, userMessage];
    
    // 4. Generate AI response using compromise.js
    const responseText = await generateResponse(
      updatedHistory,
      character.contextPrompt || undefined,
      character.name
    );
    
    // 5. Create assistant message and detect its emotion
    const responseEmotion = await detectEmotion(responseText);
    const assistantMessage: Message = {
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
      emotion: responseEmotion
    };
    
    // 6. Generate speech from text using browser's Web Speech API
    const audioBlob = await textToSpeech(responseText, getVoiceForCharacter(character));
    
    // 7. Generate lip-synced video
    const responseVideo = await simulateLipSync(videoElement, audioBlob);
    
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

// Convert speech to text using Web Speech API
export async function speechToText(audioBlob: Blob): Promise<string> {
  try {
    return await transcribeSpeech(audioBlob);
  } catch (error) {
    console.error("Speech-to-text failed:", error);
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
