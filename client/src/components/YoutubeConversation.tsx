import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle } from 'lucide-react';
import { YouTubeVideoData, getYouTubeVideo } from '../lib/storage';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import { VideoInteraction } from './VideoInteraction';
import YouTube from 'react-youtube';

interface YoutubeConversationProps {
  videoId: string;
  onClose?: () => void;
}

export function YoutubeConversation({ videoId, onClose }: YoutubeConversationProps) {
  const [videoData, setVideoData] = useState<YouTubeVideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [useAdvancedInteraction, setUseAdvancedInteraction] = useState(false);
  
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
        
        // Generate video URL (in a real implementation, we would use the YouTube iframe API)
        // For now, we're using a placeholder URL
        setVideoUrl(`https://www.youtube.com/embed/${videoId}`);
        
      } catch (err) {
        console.error('Error loading YouTube video data:', err);
        setError('Failed to load video data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadVideoData();
  }, [videoId]);
  
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
  
  if (useAdvancedInteraction) {
    // Use our advanced VideoInteraction component for speech recognition and lip-sync
    return (
      <VideoInteraction
        videoSrc={videoUrl}
        videoTranscript={videoData.transcript}
        onClose={() => setUseAdvancedInteraction(false)}
      />
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
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setUseAdvancedInteraction(true)}
          >
            Start Interactive Conversation
          </Button>
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
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
          
          <div className="p-4 bg-muted/20 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Interactive Conversation Features</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Start Interactive Conversation" to use the following features:
            </p>
            
            <ul className="list-disc list-inside text-sm space-y-2">
              <li>Speak directly to the video using your microphone</li>
              <li>Emotion detection from your voice and text</li>
              <li>Natural language responses based on video content</li>
              <li>Text-to-speech and lip-syncing technology</li>
              <li>Webcam integration for face-to-face interaction</li>
            </ul>
            
            <Button 
              onClick={() => setUseAdvancedInteraction(true)}
              className="mt-4"
            >
              Start Interactive Conversation
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}