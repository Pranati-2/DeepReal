import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { AlertCircle, Send } from 'lucide-react';
import { YouTubeVideoData, getYouTubeVideo } from '../lib/storage';
import { generateVideoContentResponse } from '../lib/youtube';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import YouTube from 'react-youtube';

interface YoutubeConversationProps {
  videoId: string;
  onClose?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function YoutubeConversation({ videoId, onClose }: YoutubeConversationProps) {
  const [videoData, setVideoData] = useState<YouTubeVideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Fetch video data
  useEffect(() => {
    async function loadVideoData() {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getYouTubeVideo(videoId);
        
        if (!data) {
          throw new Error('Video data not found');
        }
        
        setVideoData(data);
        
        // Add initial message
        setMessages([
          {
            role: 'assistant',
            content: `I've analyzed the video "${data.title}". It's about ${data.summary}. Feel free to ask me any questions about the content!`,
            timestamp: Date.now()
          }
        ]);
        
      } catch (err) {
        console.error('Error loading YouTube video data:', err);
        setError('Failed to load video data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadVideoData();
  }, [videoId]);
  
  const handleSendMessage = async () => {
    if (!input.trim() || !videoData) return;
    
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    
    // Add user message to conversation
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    
    try {
      // Generate response based on video content
      const responseContent = generateVideoContentResponse(
        videoData.transcript,
        userMessage.content
      );
      
      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (err) {
      console.error('Error generating response:', err);
      
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I encountered an error while trying to answer your question. Please try asking something else.',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading video data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }
  
  if (error || !videoData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load video</AlertTitle>
            <AlertDescription>
              {error || 'Could not load video data. Please try again.'}
            </AlertDescription>
          </Alert>
          {onClose && (
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{videoData.title}</CardTitle>
          <div className="text-sm text-muted-foreground mt-1">
            {videoData.channelTitle || 'YouTube Channel'}
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <YouTube
            videoId={videoId}
            opts={{
              width: '100%',
              height: '300',
              playerVars: {
                origin: window.location.origin
              }
            }}
            className="w-full rounded-md overflow-hidden"
          />
          
          <div>
            <div className="text-sm font-medium mb-1">Video Summary</div>
            <p className="text-sm text-muted-foreground mb-2">{videoData.summary}</p>
            
            <div className="text-sm font-medium mb-1 mt-3">Topics</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {videoData.topics.map((topic, index) => (
                <Badge key={index} variant="outline">{topic}</Badge>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4 h-[300px] overflow-y-auto p-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                  <div className="text-sm">Thinking...</div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Ask about the video..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}