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
import { Character } from '@shared/schema';
import { SpeechService } from '@/lib/speech-service';

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
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const speechServiceRef = useRef<SpeechService | null>(null);

  // Initialize speech service
  useEffect(() => {
    speechServiceRef.current = new SpeechService({
      onTranscript: (text, emotion) => {
        setTranscript(text);
        setCurrentEmotion(emotion);
        handleSpeechInput(text, emotion);
      },
      onResponse: (text, emotion) => {
        handleCharacterResponse(text, emotion);
      },
      onError: (error) => {
        setErrorMessage(error);
      }
    });

    return () => {
      speechServiceRef.current?.stopListening();
    };
  }, []);

  const handleSpeechInput = async (text: string, emotion: string) => {
    // Add user message to chat
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      emotion
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleCharacterResponse = async (text: string, emotion: string) => {
    setIsProcessing(true);
    try {
      // Add assistant message to chat
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        emotion
      };
      setMessages(prev => [...prev, newMessage]);

      // Generate video response based on text and emotion
      if (videoRef.current) {
        setIsLipSyncing(true);
        // Create a temporary audio blob from the text response
        const audioBlob = await new Promise<Blob>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(text);
          const mediaRecorder = new MediaRecorder(new MediaStream());
          const chunks: Blob[] = [];
          
          mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
          mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
          
          mediaRecorder.start();
          window.speechSynthesis.speak(utterance);
          utterance.onend = () => mediaRecorder.stop();
        });
        
        await simulateLipSync(videoRef.current, audioBlob);
        setIsLipSyncing(false);
      }
    } catch (error) {
      setErrorMessage('Failed to generate video response');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isUsingVoiceInput) {
      speechServiceRef.current?.stopListening();
    } else {
      speechServiceRef.current?.startListening();
    }
    setIsUsingVoiceInput(!isUsingVoiceInput);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      handleSpeechInput(userInput, 'neutral');
      setUserInput('');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Video Interaction</span>
          {character && (
            <Badge variant="outline">{character.name}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video display */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={currentVideoSource || undefined}
            autoPlay={isVideoPlaying}
            loop
            muted
          />
          {isLipSyncing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white">Generating lip sync...</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleVoiceInput}
            disabled={isProcessing}
          >
            {isUsingVoiceInput ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCameraActive(!isCameraActive)}
            disabled={isProcessing}
          >
            {isCameraActive ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>
          <form onSubmit={handleSubmit} className="flex-1">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isProcessing}
            />
          </form>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isProcessing || !userInput.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded-lg ${
                message.role === 'user' ? 'bg-primary/10' : 'bg-secondary/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {message.role === 'user' ? 'You' : character?.name || 'Assistant'}
                </Badge>
                {message.emotion && (
                  <Badge variant="secondary">{message.emotion}</Badge>
                )}
              </div>
              <p className="mt-1">{message.content}</p>
            </div>
          ))}
        </div>

        {/* Error message */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}