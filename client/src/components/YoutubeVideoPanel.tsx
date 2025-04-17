import React, { useState, useRef, useEffect } from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { extractYouTubeVideoId, getVideoInfo, getYouTubeTranscript, extractTopicsFromTranscript, generateVideoSummary } from '../lib/youtube';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { AlertCircle, Check, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface YoutubeVideoPanelProps {
  onVideoProcessed: (videoData: {
    videoId: string;
    title: string;
    transcript: string;
    summary: string;
    topics: string[];
  }) => void;
}

export function YoutubeVideoPanel({ onVideoProcessed }: YoutubeVideoPanelProps) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{
    title: string;
    thumbnailUrl: string;
    channelTitle: string;
  } | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [isProcessed, setIsProcessed] = useState(false);
  
  const youtubeRef = useRef<YouTube>(null);
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setError(null);
  };
  
  const handleAddVideo = async () => {
    setIsLoading(true);
    setError(null);
    setVideoInfo(null);
    setTranscript(null);
    setSummary(null);
    setTopics([]);
    setIsProcessed(false);
    
    try {
      // Extract video ID from URL
      const id = extractYouTubeVideoId(url);
      if (!id) {
        throw new Error('Invalid YouTube URL. Please enter a valid YouTube video link.');
      }
      
      setVideoId(id);
      
      // Get video info
      const info = await getVideoInfo(id);
      setVideoInfo({
        title: info.title,
        thumbnailUrl: info.thumbnailUrl,
        channelTitle: info.channelTitle
      });
      
    } catch (error) {
      console.error('Error processing YouTube URL:', error);
      setError(error instanceof Error ? error.message : 'Failed to process YouTube URL');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleProcessVideo = async () => {
    if (!videoId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get video transcript
      const videoTranscript = await getYouTubeTranscript(videoId);
      setTranscript(videoTranscript);
      
      // Extract topics from transcript
      const extractedTopics = extractTopicsFromTranscript(videoTranscript);
      setTopics(extractedTopics);
      
      // Generate summary
      const videoSummary = generateVideoSummary(videoTranscript);
      setSummary(videoSummary);
      
      // Mark as processed
      setIsProcessed(true);
      
      // Notify parent component
      if (videoInfo) {
        onVideoProcessed({
          videoId,
          title: videoInfo.title,
          transcript: videoTranscript,
          summary: videoSummary,
          topics: extractedTopics
        });
      }
      
    } catch (error) {
      console.error('Error processing video content:', error);
      setError(error instanceof Error ? error.message : 'Failed to process video content');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVideoReady = (event: YouTubeEvent) => {
    // Save player instance for future use if needed
  };
  
  const handleClearVideo = () => {
    setUrl('');
    setVideoId(null);
    setVideoInfo(null);
    setTranscript(null);
    setSummary(null);
    setTopics([]);
    setIsProcessed(false);
    setError(null);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add YouTube Video</CardTitle>
        <CardDescription>
          Enter a YouTube URL to make it interactive and conversational
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="YouTube video URL"
            value={url}
            onChange={handleUrlChange}
            disabled={isLoading}
          />
          <Button onClick={handleAddVideo} disabled={!url || isLoading}>
            Add
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {videoId && videoInfo && (
          <div className="mb-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">{videoInfo.title}</h3>
                <p className="text-sm text-muted-foreground">{videoInfo.channelTitle}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClearVideo}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <YouTube
              videoId={videoId}
              onReady={handleVideoReady}
              opts={{
                width: '100%',
                height: '300',
                playerVars: {
                  origin: window.location.origin
                }
              }}
              className="w-full rounded-md overflow-hidden my-4"
              ref={youtubeRef}
            />
            
            {!isProcessed && (
              <Button 
                onClick={handleProcessVideo} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Process Video for Conversation'}
              </Button>
            )}
            
            {isProcessed && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span className="text-sm font-medium">Video processed successfully</span>
                </div>
                
                {summary && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Summary</h4>
                    <p className="text-sm text-muted-foreground">{summary}</p>
                  </div>
                )}
                
                {topics.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((topic, index) => (
                        <Badge key={index} variant="outline">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}