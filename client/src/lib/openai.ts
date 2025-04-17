import { Message } from "@shared/schema";
import nlp from 'compromise';
import sentences from 'compromise-sentences';

// Load compromise plugin
nlp.extend(sentences);

// Browser Speech Recognition API for speech-to-text
export async function transcribeSpeech(audioBlob: Blob): Promise<string> {
  try {
    // For browser compatibility, we'll use the Web Speech API
    // In a full implementation, we could load Whisper.cpp via WebAssembly or use Vosk
    return new Promise((resolve, reject) => {
      // Create a temporary audio element to play the blob
      const audioElement = new Audio(URL.createObjectURL(audioBlob));
      
      // Using browser's built-in speech recognition
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
        URL.revokeObjectURL(audioElement.src); // Clean up
        resolve(transcript);
      };
      
      recognition.onerror = (event: any) => {
        URL.revokeObjectURL(audioElement.src); // Clean up
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      // In a real implementation with Whisper or Vosk:
      // 1. We would load the model
      // 2. Process the audio blob
      // 3. Return the transcription
      
      recognition.start();
      audioElement.play(); // Play the audio for the recognition
    });
  } catch (error) {
    console.error('Speech transcription error:', error);
    throw error;
  }
}

// Simple emotion detection using compromise.js
export async function detectEmotion(text: string): Promise<string> {
  try {
    // Use compromise to analyze the text
    const doc = nlp(text);
    
    // Simple emotion detection based on keywords
    const emotions: Record<string, string[]> = {
      happy: ['happy', 'glad', 'joy', 'excited', 'fantastic', 'wonderful', 'great', 'love', 'smile', 'laugh'],
      sad: ['sad', 'unhappy', 'miserable', 'depressed', 'unfortunate', 'sorry', 'upset', 'cry', 'tears'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate', 'rage', 'upset', 'irritated'],
      surprised: ['surprised', 'shocked', 'astonished', 'amazed', 'wow', 'unexpected', 'incredible'],
      neutral: ['ok', 'fine', 'alright', 'average', 'neutral', 'normal'],
      excited: ['excited', 'thrilled', 'eager', 'enthusiastic', 'pumped', 'stoked'],
      curious: ['curious', 'wonder', 'wondering', 'interested', 'intrigued', 'question'],
      confused: ['confused', 'puzzled', 'baffled', 'unsure', 'uncertain', 'perplexed'],
      friendly: ['friendly', 'kind', 'nice', 'pleasant', 'warm', 'gentle']
    };
    
    // Count matches for each emotion
    const matches: Record<string, number> = {};
    
    Object.entries(emotions).forEach(([emotion, keywords]) => {
      matches[emotion] = 0;
      keywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          matches[emotion]++;
        }
      });
    });
    
    // Simple sentiment analysis using compromise
    // Get an array of sentences
    const sentences = doc.sentences().out('array') as string[];
    
    // Calculate sentiment score
    const sentiment = sentences.map((sent: string) => {
      const sentDoc = nlp(sent);
      const jsonData = sentDoc.sentences().json();
      // Check if any term has a Negative tag
      return jsonData[0]?.terms?.some((term: any) => term.tags?.has('Negative')) ? -1 : 1;
    }).reduce((sum: number, val: number) => sum + val, 0);
    
    // If no clear emotion matches found, use sentiment analysis
    if (Math.max(...Object.values(matches)) === 0) {
      if (sentiment > 0) return 'happy';
      if (sentiment < 0) return 'sad';
      return 'neutral';
    }
    
    // Find emotion with most matches
    let maxEmotion = 'neutral';
    let maxCount = 0;
    
    Object.entries(matches).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxEmotion = emotion;
      }
    });
    
    return maxEmotion;
  } catch (error) {
    console.error('Emotion detection error:', error);
    return 'neutral'; // Fallback to neutral on error
  }
}

// Generate response using compromise.js
export async function generateResponse(
  messages: Message[], 
  contextPrompt?: string,
  characterName?: string
): Promise<string> {
  try {
    // In a full implementation, this would integrate with an LLM API
    // like Mixtral, Ollama, or a similar service
    
    // For now, we'll use compromise to analyze the last message and generate a response
    if (messages.length === 0) {
      return "Hello! How can I help you today?";
    }
    
    const lastMessage = messages[messages.length - 1];
    const doc = nlp(lastMessage.content);
    
    // Analyze if it's a question
    const isQuestion = doc.questions().json().length > 0;
    
    // Extract topics/subjects from the message
    const topics = doc.nouns().out('array');
    const verbs = doc.verbs().out('array');
    
    // Simple response generation based on message analysis
    if (isQuestion) {
      // Handle questions based on content
      if (lastMessage.content.toLowerCase().includes('how are you')) {
        return `I'm doing well, thank you for asking! As ${characterName || 'an AI'}, I'm always ready to chat. How about you?`;
      }
      
      if (lastMessage.content.toLowerCase().includes('your name')) {
        return `I'm ${characterName || 'an AI assistant'}. It's nice to meet you!`;
      }
      
      if (lastMessage.content.toLowerCase().includes('help')) {
        return `I'd be happy to help! I can have a conversation with you about various topics. ${contextPrompt ? `Specifically, I can talk about: ${contextPrompt}` : 'What would you like to discuss?'}`;
      }
      
      // Generic question response
      return `That's an interesting question about ${topics.length > 0 ? topics[0] : 'that topic'}. ${
        contextPrompt 
          ? `As someone focused on ${contextPrompt}, I would say it depends on the specific context.` 
          : `I'd be happy to discuss this further if you'd like to explore it more.`
      }`;
    } else {
      // Handle statements
      if (lastMessage.content.length < 10) {
        return "Could you tell me more about that?";
      }
      
      if (verbs.length > 0 && topics.length > 0) {
        return `I see you're interested in ${topics[0]} and ${verbs[0]}. That's fascinating! ${
          contextPrompt 
            ? `In the context of ${contextPrompt}, this is definitely worth exploring.` 
            : `Would you like to discuss this further?`
        }`;
      }
      
      // Generic response
      return `Thanks for sharing that with me. ${
        contextPrompt 
          ? `As someone with expertise in ${contextPrompt}, I find your perspective interesting.` 
          : `I'm enjoying our conversation!`
      } Is there anything specific you'd like to know?`;
    }
  } catch (error) {
    console.error('Response generation error:', error);
    return "I'm sorry, I'm having trouble understanding. Could you rephrase that?";
  }
}

// Text to speech using Web Speech API
export async function textToSpeech(text: string, voiceType: string = 'default'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported in this browser'));
      return;
    }
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    let voices = speechSynthesis.getVoices();
    
    // If voices aren't loaded yet, wait for them
    if (voices.length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        setVoice();
      };
    } else {
      setVoice();
    }
    
    // Select appropriate voice based on voice type
    function setVoice() {
      // Choose voice based on type
      let selectedVoice;
      
      switch(voiceType.toLowerCase()) {
        case 'male':
          selectedVoice = voices.find(voice => voice.name.includes('Male') || voice.name.includes('man'));
          break;
        case 'female':
          selectedVoice = voices.find(voice => voice.name.includes('Female') || voice.name.includes('woman'));
          break;
        default:
          // Default to first available voice
          selectedVoice = voices[0];
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }
    
    // In a complete implementation, we would use:
    // 1. Record the audio to an AudioBuffer
    // 2. Convert the AudioBuffer to a Blob
    
    // For now, we'll simulate this with a MediaRecorder
    // It's a workaround to get the speech as a blob
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const mediaRecorder = new MediaRecorder(destination.stream);
    const chunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      resolve(audioBlob);
    };
    
    // Start recording
    mediaRecorder.start();
    
    // Speak the text
    utterance.onend = () => {
      mediaRecorder.stop();
      audioContext.close();
    };
    
    utterance.onerror = (event) => {
      mediaRecorder.stop();
      audioContext.close();
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };
    
    window.speechSynthesis.speak(utterance);
  });
}
