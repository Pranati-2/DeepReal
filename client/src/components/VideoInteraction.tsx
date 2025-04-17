import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mic, MicOff, Video, VideoOff, Send, RotateCcw, Download } from 'lucide-react';
import { recordAudio, createVideoSource, playVideo, simulateLipSync, downloadBlob } from '@/lib/media';
import { generateResponse, detectEmotionFromText, synthesizeSpeech, transcribeSpeech, initializeSpeechRecognition, segmentText } from '@/lib/speech';
import { Character } from '@shared/schema';

interface VideoInteractionProps {
  character?: Character;
  videoSrc?: string;
  videoTranscript?: string;
  onClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  emotion?: string;
}

export function VideoInteraction({ 
  character, 
  videoSrc, 
  videoTranscript,
  onClose 
}: VideoInteractionProps) {
  // State for video and audio
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentVideoSource, setCurrentVideoSource] = useState<string | null>(videoSrc || null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLipSyncing, setIsLipSyncing] = useState(false);
  const [isUsingVoiceInput, setIsUsingVoiceInput] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const recorderRef = useRef<{ start: () => void; stop: () => Promise<Blob> } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    const initSpeechRecognition = async () => {
      const recognition = await initializeSpeechRecognition();
      
      if (recognition) {
        recognition.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            const text = result.item(0).transcript;
            setUserInput(text);
          } else {
            const interim = result.item(0).transcript;
            setTranscript(interim);
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setErrorMessage(`Speech recognition error: ${event.error}`);
          setIsUsingVoiceInput(false);
        };
        
        recognition.onend = () => {
          if (isUsingVoiceInput) {
            recognition.start();
          }
        };
        
        recognitionRef.current = recognition;
      }
    };
    
    initSpeechRecognition();
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Audio recorder setup
  useEffect(() => {
    const setupRecorder = async () => {
      try {
        const recorder = await recordAudio();
        recorderRef.current = recorder;
      } catch (error) {
        console.error('Failed to setup audio recorder:', error);
        setErrorMessage('Could not access microphone. Please check your browser permissions.');
      }
    };
    
    setupRecorder();
  }, []);
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle video play events
  useEffect(() => {
    if (videoRef.current && currentVideoSource) {
      videoRef.current.onplay = () => setIsVideoPlaying(true);
      videoRef.current.onpause = () => setIsVideoPlaying(false);
      videoRef.current.onended = () => setIsVideoPlaying(false);
    }
  }, [currentVideoSource]);

  // Toggle speech recognition
  const toggleVoiceInput = () => {
    if (isUsingVoiceInput) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsUsingVoiceInput(false);
      setTranscript('');
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsUsingVoiceInput(true);
      } else {
        setErrorMessage('Speech recognition not available in this browser.');
      }
    }
  };
  
  // Start audio recording
  const startRecording = async () => {
    if (!recorderRef.current) return;
    
    try {
      recorderRef.current.start();
      setIsRecording(true);
      setErrorMessage(null);
    } catch (error) {
      console.error('Recording error:', error);
      setErrorMessage('Error starting recording. Please try again.');
    }
  };
  
  // Stop audio recording and process speech
  const stopRecording = async () => {
    if (!recorderRef.current || !isRecording) return;
    
    try {
      const audioBlob = await recorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      
      // Transcribe the audio
      const text = await transcribeSpeech(audioBlob);
      
      // Process the transcribed text
      await processUserInput(text);
      
    } catch (error) {
      console.error('Error processing audio:', error);
      setErrorMessage('Error processing your speech. Please try again or type your message.');
      setIsProcessing(false);
    }
  };
  
  // Process text input from user (either typed or from speech recognition)
  const processUserInput = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      // Detect emotion from text
      const emotion = detectEmotionFromText(text);
      
      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
        emotion
      };
      
      // Add user message to conversation
      setMessages(prev => [...prev, userMessage]);
      setUserInput('');
      
      // Prepare context for response generation
      let context = '';
      
      // Include character backstory if available
      if (character?.description) {
        context += character.description + ' ';
      }
      
      // Include recent conversation history (last 5 messages)
      const recentMessages = messages.slice(-5);
      for (const msg of recentMessages) {
        context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      }
      
      // Generate response using speech lib (placeholder until LLM integration)
      const responseContent = await generateResponse(
        text, 
        context,
        emotion,
        videoTranscript
      );
      
      // Create assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
        emotion: 'neutral' // Default emotion for assistant
      };
      
      // Add assistant message to conversation
      setMessages(prev => [...prev, assistantMessage]);
      
      // Synthesize speech for the response
      if (character?.voiceType) {
        try {
          // Segment text into sentences for more natural speech
          const sentences = segmentText(responseContent);
          
          for (const sentence of sentences) {
            await synthesizeSpeech(sentence, character.voiceType);
          }
          
          // Here we would integrate lip-syncing using SadTalker or Wav2Lip
          // For now we'll use our placeholder lip-sync function
          if (videoRef.current && currentVideoSource) {
            setIsLipSyncing(true);
            // TODO: Replace with real lip-syncing implementation
            setTimeout(() => {
              setIsLipSyncing(false);
            }, 2000);
          }
        } catch (error) {
          console.error('Speech synthesis error:', error);
        }
      }
      
    } catch (error) {
      console.error('Error processing input:', error);
      setErrorMessage('Error processing your message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle form submission for text input
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processUserInput(userInput);
  };
  
  // Play or pause video
  const toggleVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };
  
  // Toggle webcam
  const toggleCamera = () => {
    setIsCameraActive(!isCameraActive);
  };
  
  // Record and download conversation
  const downloadConversation = () => {
    const conversationText = messages
      .map(msg => `${msg.role === 'user' ? 'You' : character?.name || 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    downloadBlob(blob, `conversation-${new Date().toISOString().slice(0, 10)}.txt`);
  };
  
  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>
            {character ? `Conversation with ${character.name}` : 'Video Interaction'}
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={toggleCamera}>
              {isCameraActive ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={downloadConversation}>
              <Download className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="outline" size="icon" onClick={onClose}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {/* Video and webcam container */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          {currentVideoSource && (
            <video
              ref={videoRef}
              src={currentVideoSource}
              className={`w-full h-full object-contain ${isLipSyncing ? 'animate-pulse' : ''}`}
              controls={false}
            />
          )}
          
          {isCameraActive && (
            <div className="absolute bottom-2 right-2 w-1/4 h-1/4 overflow-hidden rounded border-2 border-primary">
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="absolute bottom-2 left-2 flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={toggleVideo}
              disabled={!currentVideoSource}
            >
              {isVideoPlaying ? 'Pause' : 'Play'}
            </Button>
          </div>
        </div>
        
        {/* Conversation history */}
        <div className="flex-1 overflow-y-auto p-4 bg-muted/20 rounded-lg space-y-4 min-h-[200px] max-h-[300px]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">
                    {message.role === 'user' ? 'You' : character?.name || 'Assistant'}
                  </span>
                  {message.emotion && message.emotion !== 'neutral' && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {message.emotion}
                    </Badge>
                  )}
                </div>
                <div className="text-sm">{message.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Transcript display (when using voice input) */}
        {isUsingVoiceInput && transcript && (
          <div className="p-2 bg-muted/50 rounded text-sm italic">
            {transcript}
          </div>
        )}
        
        {/* Input area */}
        <div className="flex items-center space-x-2 pt-2">
          <Button
            type="button"
            size="icon"
            variant={isUsingVoiceInput ? "default" : "outline"}
            onClick={toggleVoiceInput}
            disabled={isProcessing}
          >
            {isUsingVoiceInput ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          
          <form onSubmit={handleSubmit} className="flex-1 flex items-center space-x-2">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isProcessing || isUsingVoiceInput}
            />
            <Button 
              type="submit" 
              disabled={!userInput.trim() || isProcessing}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}