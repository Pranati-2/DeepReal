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
  const handleTranscript = (text: string, emotion: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      emotion,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // In a real app, this would trigger an LLM response
    // For now we'll use a timeout to simulate processing
    setTimeout(() => {
      // Generate a simple response
      let responseText = "I heard you! In a full implementation, this would generate a response using Mixtral or another open-source LLM, and would be based on the video content and conversation context.";
      
      if (videoTranscript) {
        responseText += " The response would incorporate relevant information from the video transcript.";
      }
      
      // Add assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseText,
        emotion: 'neutral',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };
  
  // Handle LLM responses
  const handleResponse = (text: string, emotion: string) => {
    // This would trigger the lip-sync process in a full implementation
    console.log('Response generated:', text, 'with emotion:', emotion);
    
    // Simulate creating audio for lip-sync
    // In a full implementation, this would use Coqui TTS or OpenVoice
    setTimeout(() => {
      // For now, we'll just create an empty audio blob as a placeholder
      const audioBlob = new Blob([], { type: 'audio/mp3' });
      setCurrentAudioBlob(audioBlob);
      
      // Switch to lip-sync tab
      setActiveTab('lipsync');
    }, 500);
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