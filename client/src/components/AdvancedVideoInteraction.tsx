import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SpeechEngine } from './SpeechEngine';
import { LipSyncPlayer } from './LipSyncPlayer';
import Webcam from 'react-webcam';
import {
  Mic, MicOff, Video, VideoOff, RotateCcw, Download,
  MessageSquare, Text, Settings, Maximize, Minimize
} from 'lucide-react';
import { Character } from '@shared/schema';
import { processUserInput, speechToText, getVoiceForCharacter, getLipSyncProfileForCharacter } from '@/lib/character';
import { synthesizeSpeech } from '@/lib/coqui-tts';
import { generateMixtralResponse, detectEmotionWithMixtral } from '@/lib/mixtral';
import { generateLipSync } from '@/lib/lipsync';

interface AdvancedVideoInteractionProps {
  videoSrc?: string;
  videoTranscript?: string;
  character?: Character;
  onClose?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
  timestamp: number;
}

export function AdvancedVideoInteraction({
  videoSrc,
  videoTranscript,
  character,
  onClose
}: AdvancedVideoInteractionProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState('conversation');
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lipSyncVideo, setLipSyncVideo] = useState<Blob | null>(null);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Create welcome message on mount
  useEffect(() => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: character 
        ? `Hello! I'm ${character.name}. ${character.description} How can I help you today?`
        : 'Hello! I am a digital assistant. How can I help you today?',
      emotion: 'neutral',
      timestamp: Date.now()
    };
    
    setMessages([welcomeMessage]);
  }, [character]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle full screen toggle
  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullScreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);
  
  // Toggle webcam
  const toggleWebcam = () => {
    setIsWebcamActive(!isWebcamActive);
  };
  
  // Handle speech recognition results
  const handleTranscript = async (text: string, emotion: string) => {
    try {
      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        emotion,
        timestamp: Date.now()
      };
      
      // Add message to the state
      setMessages(prev => [...prev, userMessage]);
      
      // Get conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        emotion: msg.emotion
      }));
      
      // Use our Mixtral LLM to generate a response
      const previousMessages = conversationHistory.map(message => ({
        role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: message.content
      }));
      
      // Add current message
      previousMessages.push({
        role: 'user' as const,
        content: text
      });
      
      // Generate response using Mixtral
      let responseText: string;
      let responseEmotion: string;
      
      try {
        console.log("Generating response using Mixtral...");
        
        // Add video transcript to context if available
        const contextPrompt = videoTranscript ? 
          `You are ${character?.name || 'an AI assistant'}. The following is a transcript of a video: ${videoTranscript}. 
           Based on this video content, answer the user's questions or respond to their statements.` 
          : undefined;
        
        responseText = await generateMixtralResponse(previousMessages, contextPrompt);
        responseEmotion = await detectEmotionWithMixtral(responseText);
      } catch (error) {
        console.warn("Error generating response with Mixtral:", error);
        responseText = "I'm processing your request. In a complete implementation, I would use Mixtral or another open-source LLM to generate a contextually relevant response based on our conversation and the video content.";
        responseEmotion = "neutral";
      }
      
      // Create assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseText,
        emotion: responseEmotion,
        timestamp: Date.now()
      };
      
      // Add to conversation
      setMessages(prev => [...prev, assistantMessage]);
      
      // Generate speech from the response text
      handleResponse(responseText, responseEmotion);
    } catch (error) {
      console.error("Error handling transcript:", error);
      setErrorMessage("An error occurred while processing your speech. Please try again.");
    }
  };
  
  // Handle LLM responses by generating speech and lip-sync
  const handleResponse = async (text: string, emotion: string) => {
    try {
      console.log('Generating speech for:', text, 'with emotion:', emotion);
      
      // Use Coqui TTS to convert text to speech
      let audioBlob: Blob;
      try {
        const voice = character ? getVoiceForCharacter(character) : 'default';
        audioBlob = await synthesizeSpeech(text, voice, emotion as any);
        console.log("Speech synthesized with Coqui TTS");
      } catch (error) {
        console.warn("Error synthesizing speech with Coqui TTS:", error);
        // Fallback to simple audio blob
        audioBlob = new Blob([new ArrayBuffer(1000)], { type: 'audio/wav' });
      }
      
      // Store the audio blob for lip-sync
      setCurrentAudioBlob(audioBlob);
      
      // Switch to lip-sync tab to show the animation
      setActiveTab('lipsync');
      
      // In a complete implementation, we would generate the lip-sync video here
      // by calling our lip-sync service with the video and audio
      if (videoSrc) {
        try {
          const profile = character ? getLipSyncProfileForCharacter(character) : 'default';
          
          // This would be a call to generate the lip-sync in production
          // For now, we'll rely on the LipSyncPlayer component to simulate this
          console.log("Lip sync would be generated with profile:", profile);
        } catch (error) {
          console.warn("Error preparing lip-sync:", error);
        }
      }
    } catch (error) {
      console.error("Error handling response:", error);
      setErrorMessage("An error occurred while generating the response. Please try again.");
    }
  };
  
  // Handle successful lip-sync generation
  const handleLipSyncComplete = ({ videoBlob }: { videoBlob: Blob }) => {
    setLipSyncVideo(videoBlob);
    
    // In a full implementation, this would:
    // 1. Save the lip-synced video
    // 2. Update the UI with the new video
    // 3. Possibly trigger the next step in a conversation flow
  };
  
  // Download conversation history
  const downloadConversation = () => {
    const conversationText = messages
      .map(msg => {
        const speaker = msg.role === 'user' ? 'You' : (character?.name || 'Assistant');
        const emotion = msg.emotion ? ` [${msg.emotion}]` : '';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        return `${speaker}${emotion} (${time}):\n${msg.content}\n`;
      })
      .join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {character ? `Conversation with ${character.name}` : 'Advanced Video Interaction'}
              </CardTitle>
              <CardDescription>
                Using speech recognition, LLM, and lip-sync technologies
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleWebcam}
                title={isWebcamActive ? "Turn off webcam" : "Turn on webcam"}
              >
                {isWebcamActive ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleFullScreen}
                title={isFullScreen ? "Exit full screen" : "Enter full screen"}
              >
                {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={downloadConversation}
                title="Download conversation"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              {onClose && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onClose}
                  title="Close interaction"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Left side: Video and webcam */}
            <div className="flex flex-col space-y-4">
              {/* Main video display */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {videoSrc && (
                  <video 
                    src={videoSrc} 
                    className="w-full h-full object-contain"
                    controls
                  />
                )}
                
                {/* Webcam overlay if active */}
                {isWebcamActive && (
                  <div className="absolute bottom-2 right-2 w-1/4 h-1/4 overflow-hidden rounded border-2 border-primary">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      mirrored
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              
              {/* Speech engine */}
              <SpeechEngine 
                onTranscript={handleTranscript}
                onResponse={handleResponse}
                characterVoice={character?.voiceType || undefined}
                isActive={activeTab === 'conversation'}
              />
            </div>
            
            {/* Right side: Conversation/LipSync tabs */}
            <div className="flex flex-col h-full">
              <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full h-full flex flex-col"
              >
                <TabsList className="mb-2 self-start">
                  <TabsTrigger value="conversation">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Conversation
                  </TabsTrigger>
                  <TabsTrigger value="lipsync">
                    <Video className="h-4 w-4 mr-2" />
                    Lip Sync
                  </TabsTrigger>
                  <TabsTrigger value="transcript">
                    <Text className="h-4 w-4 mr-2" />
                    Transcript
                  </TabsTrigger>
                </TabsList>
                
                {/* Conversation history */}
                <TabsContent value="conversation" className="flex-1 mt-0">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 bg-muted/20 rounded-lg space-y-4">
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
                  </div>
                </TabsContent>
                
                {/* Lip sync tab */}
                <TabsContent value="lipsync" className="flex-1 mt-0">
                  <LipSyncPlayer
                    videoSrc={videoSrc}
                    audioSrc={currentAudioBlob ? URL.createObjectURL(currentAudioBlob) : undefined}
                    character={character}
                    onLipSyncComplete={handleLipSyncComplete}
                  />
                </TabsContent>
                
                {/* Transcript tab */}
                <TabsContent value="transcript" className="flex-1 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Video Transcript</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[400px] overflow-y-auto p-4 bg-muted/20 rounded-lg">
                        {videoTranscript ? (
                          <p className="whitespace-pre-line">{videoTranscript}</p>
                        ) : (
                          <p className="text-muted-foreground italic">No transcript available for this video.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}