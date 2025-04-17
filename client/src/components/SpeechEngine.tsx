import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import nlp from 'compromise';
import nlpSentences from 'compromise-sentences';
import { detectEmotionFromText } from '@/lib/speech';
import { getVoskSpeechService, VoskSpeechService } from '@/lib/vosk-speech';

// Initialize nlp with the sentences plugin
nlp.extend(nlpSentences);

interface SpeechEngineProps {
  onTranscript?: (text: string, emotion: string) => void;
  onResponse?: (text: string, emotion: string) => void;
  characterVoice?: string;
  isActive?: boolean;
}

export function SpeechEngine({ 
  onTranscript,
  onResponse,
  characterVoice = 'default',
  isActive = true
}: SpeechEngineProps) {
  // State for speech recognition
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [emotionDetected, setEmotionDetected] = useState<string>('neutral');
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [useVosk, setUseVosk] = useState(true); // Use Vosk by default
  
  // Refs for speech recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voskServiceRef = useRef<VoskSpeechService | null>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize Vosk speech recognition
  useEffect(() => {
    async function initializeVosk() {
      try {
        const voskService = getVoskSpeechService();
        const initialized = await voskService.initialize();
        
        if (initialized) {
          voskServiceRef.current = voskService;
          setError(null);
          console.log('Vosk speech recognition initialized successfully');
        } else {
          setError('Failed to initialize Vosk speech recognition');
          // Fall back to browser speech recognition
          setUseVosk(false);
        }
      } catch (err) {
        console.error('Error initializing Vosk:', err);
        setError('Error initializing speech recognition. Falling back to browser API.');
        setUseVosk(false);
      }
    }
    
    if (useVosk) {
      initializeVosk();
    }
    
    return () => {
      // Clean up Vosk if needed
      if (voskServiceRef.current) {
        voskServiceRef.current.cleanup();
        voskServiceRef.current = null;
      }
    };
  }, [useVosk]);
  
  // Setup browser speech recognition as fallback
  useEffect(() => {
    // Only use browser speech recognition if Vosk is not being used
    if (useVosk) return;
    
    // Check if speech recognition is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser');
      return;
    }
    
    // Create speech recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configure speech recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Default to English, can be changed
    
    // Set up event handlers
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      
      // If we were still supposed to be listening, restart
      if (isListening && isActive) {
        try {
          recognition.start();
        } catch (err) {
          console.error('Could not restart speech recognition:', err);
        }
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    
    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      let highestConfidence = 0;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Get confidence of this result
        const resultConfidence = result[0].confidence;
        if (resultConfidence > highestConfidence) {
          highestConfidence = resultConfidence;
        }
        
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      
      // Update confidence level (0-100)
      setConfidence(Math.round(highestConfidence * 100));
      
      // Update transcripts
      if (finalText) {
        setTranscript(prev => prev + ' ' + finalText);
        
        // Detect emotion from the final text
        const emotion = detectEmotionFromText(finalText);
        setEmotionDetected(emotion);
        
        // Send to parent component
        if (onTranscript) {
          onTranscript(finalText, emotion);
        }
        
        // Reset interim transcript
        setInterimTranscript('');
      } else if (interimText) {
        setInterimTranscript(interimText);
      }
    };
    
    // Save reference
    recognitionRef.current = recognition;
    
    // Cleanup
    return () => {
      try {
        recognition.stop();
      } catch (err) {
        // Ignore errors when stopping
      }
    };
  }, [isActive, onTranscript, useVosk, isListening]);
  
  // Load available voices for speech synthesis
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis is not supported in this browser');
      return;
    }
    
    // Function to load voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Try to find a voice that matches the character's voice
      if (characterVoice && characterVoice !== 'default') {
        const matchingVoice = voices.find(v => 
          v.name.toLowerCase().includes(characterVoice.toLowerCase()) || 
          v.lang.toLowerCase().includes(characterVoice.toLowerCase())
        );
        
        if (matchingVoice) {
          setSelectedVoice(matchingVoice);
        } else {
          // Default to the first voice or a general voice
          const defaultVoice = voices.find(v => v.default) || voices[0];
          setSelectedVoice(defaultVoice);
        }
      } else {
        // Default to the first voice
        const defaultVoice = voices.find(v => v.default) || voices[0];
        setSelectedVoice(defaultVoice);
      }
    };
    
    // Load voices initially
    loadVoices();
    
    // Voices may load asynchronously, so listen for the voiceschanged event
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Cleanup
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [characterVoice]);
  
  // Handle Vosk transcription updates
  const handleVoskTranscription = (text: string) => {
    setInterimTranscript(text);
    
    // Clear any existing timeout
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
    }
    
    // Set a timeout to consider the transcript final after a pause in speech
    transcriptTimeoutRef.current = setTimeout(() => {
      if (text.trim()) {
        setTranscript(prev => {
          const newTranscript = prev ? `${prev} ${text}` : text;
          
          // Detect emotion
          const emotion = detectEmotionFromText(text);
          setEmotionDetected(emotion);
          
          // Send to parent component
          if (onTranscript) {
            onTranscript(text, emotion);
          }
          
          return newTranscript;
        });
        setInterimTranscript('');
      }
    }, 1000); // 1 second pause to consider speech final
  };
  
  // Toggle Vosk speech recognition
  const toggleVoskListening = async () => {
    if (!voskServiceRef.current) {
      setError('Vosk speech recognition not available');
      return;
    }
    
    if (isListening) {
      try {
        const finalTranscript = await voskServiceRef.current.stop();
        if (finalTranscript.trim()) {
          // Process final transcript if there's any remaining
          const emotion = detectEmotionFromText(finalTranscript);
          setEmotionDetected(emotion);
          
          // Send to parent component if needed
          if (onTranscript) {
            onTranscript(finalTranscript, emotion);
          }
        }
        setIsListening(false);
      } catch (err) {
        console.error('Error stopping Vosk speech recognition:', err);
        setError('Error stopping speech recognition');
      }
    } else {
      try {
        // Before starting, make sure Vosk is initialized
        if (!voskServiceRef.current.isReady()) {
          await voskServiceRef.current.initialize();
        }
        
        // Set up the transcription callback
        voskServiceRef.current.onTranscription(handleVoskTranscription);
        
        // Start listening
        await voskServiceRef.current.start();
        setIsListening(true);
        setError(null);
        
        // Reset states
        setInterimTranscript('');
        setConfidence(0);
      } catch (err) {
        console.error('Error starting Vosk speech recognition:', err);
        setError('Could not start speech recognition');
        
        // Fall back to browser API if Vosk fails
        setUseVosk(false);
      }
    }
  };
  
  // Toggle browser speech recognition
  const toggleBrowserListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setError(null);
        setIsListening(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setError('Could not start speech recognition');
      }
    }
  };
  
  // Toggle speech recognition (Vosk or browser API)
  const toggleListening = () => {
    if (useVosk) {
      toggleVoskListening();
    } else {
      toggleBrowserListening();
    }
  };
  
  // Text-to-speech function
  const speakText = async (text: string, emotion: string = 'neutral') => {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis is not supported in this browser');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice if available
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Adjust pitch and rate based on emotion
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
      default:
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
    }
    
    // Set events
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setError('Error speaking text');
      setIsSpeaking(false);
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  };
  
  // Process speech - in a real app, this would use a real LLM
  const processSpeech = async () => {
    if (!transcript.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Simplified response generation
      // In a real app, this would call a local LLM like Mixtral
      const response = simulateResponse(transcript, emotionDetected);
      const responseEmotion = 'neutral'; // This would be set by the LLM
      
      // Speak the response
      await speakText(response, responseEmotion);
      
      // Send response to parent
      if (onResponse) {
        onResponse(response, responseEmotion);
      }
      
      // Clear transcript for next interaction
      setTranscript('');
      
    } catch (err) {
      console.error('Error processing speech:', err);
      setError('Error processing your speech');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // This is a simplified response generator - would be replaced with actual LLM
  const simulateResponse = (input: string, emotion: string): string => {
    // Simple rule-based responses
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return 'Hello there! How can I help you today?';
    }
    
    if (lowerInput.includes('how are you')) {
      return "I'm doing well, thank you for asking! How about you?";
    }
    
    if (lowerInput.includes('your name')) {
      return "I'm an AI assistant designed to help with your questions.";
    }
    
    if (lowerInput.includes('thank')) {
      return "You're welcome! Is there anything else I can help with?";
    }
    
    // Default response based on the detected emotion
    if (emotion === 'happy') {
      return "You sound happy! That's great to hear. What else would you like to talk about?";
    } else if (emotion === 'sad') {
      return "I notice you might be feeling down. Is there something specific you'd like to discuss?";
    } else if (emotion === 'angry') {
      return "I understand you might be frustrated. Let me know how I can help address your concerns.";
    } else {
      return "I understand. Can you tell me more about what's on your mind?";
    }
  };
  
  // Clear current transcript
  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Speech Engine</span>
          {emotionDetected !== 'neutral' && (
            <Badge variant="outline">{emotionDetected}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive p-2 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {/* Progress bar for confidence */}
        {isListening && (
          <div className="space-y-2">
            <div className="text-sm flex justify-between">
              <span>Confidence</span>
              <span>{confidence}%</span>
            </div>
            <Progress value={confidence} className="h-1" />
          </div>
        )}
        
        {/* Transcript display */}
        <div className="min-h-[100px] max-h-[150px] overflow-y-auto p-3 bg-muted/30 rounded-md text-sm">
          {transcript && <div>{transcript}</div>}
          {interimTranscript && (
            <div className="text-muted-foreground italic">{interimTranscript}</div>
          )}
          {!transcript && !interimTranscript && (
            <div className="text-muted-foreground italic">
              {isListening ? 'Listening...' : 'Click the microphone to start speaking'}
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex justify-between">
          <div>
            <Button
              variant={isListening ? "default" : "outline"}
              size="icon"
              onClick={toggleListening}
              disabled={!isActive || isProcessing}
              className="mr-2"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button
              variant={isSpeaking ? "default" : "outline"}
              size="icon"
              onClick={() => {
                if (isSpeaking) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                } else {
                  speakText('Hello, I am testing the speech synthesis capabilities.');
                }
              }}
              disabled={!isActive}
            >
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
          
          <div>
            <Button 
              variant="ghost"
              size="sm"
              onClick={clearTranscript}
              disabled={!transcript && !interimTranscript}
              className="mr-2"
            >
              Clear
            </Button>
            
            <Button
              onClick={processSpeech}
              disabled={!transcript.trim() || isProcessing || isSpeaking}
            >
              {isProcessing ? 'Processing...' : 'Process Speech'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}