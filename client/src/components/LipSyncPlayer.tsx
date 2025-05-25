import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Volume2, VolumeX, Mic, MicOff, 
  Video, Download
} from 'lucide-react';
import { downloadBlob } from '@/lib/media';

interface LipSyncPlayerProps {
  videoSrc?: string;
  audioSrc?: string;
  character?: {
    id: number;
    name: string;
    description?: string;
  };
  responsive?: boolean;
  onLipSyncComplete?: (result: { videoBlob: Blob }) => void;
}

export function LipSyncPlayer({
  videoSrc,
  audioSrc,
  character,
  responsive = true,
  onLipSyncComplete
}: LipSyncPlayerProps) {
  // State for video and audio playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lipSyncResult, setLipSyncResult] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for media elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // Load media when sources change
  useEffect(() => {
    if (videoRef.current && videoSrc) {
      videoRef.current.src = videoSrc;
      videoRef.current.load();
    }
    
    if (audioRef.current && audioSrc) {
      audioRef.current.src = audioSrc;
      audioRef.current.load();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [videoSrc, audioSrc]);
  
  // Setup video event listeners
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    // Add event listeners
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);
    
    // Cleanup
    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  // Playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    } else {
      videoRef.current.play();
      if (audioRef.current) audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const seekTo = (time: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.currentTime = time;
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };
  
  const handleSliderChange = (values: number[]) => {
    if (!videoRef.current || !values.length) return;
    
    const newTime = (values[0] / 100) * duration;
    seekTo(newTime);
  };
  
  const handleVolumeChange = (values: number[]) => {
    if (!values.length) return;
    
    const newVolume = values[0] / 100;
    setVolume(newVolume);
    
    if (videoRef.current) videoRef.current.volume = newVolume;
    if (audioRef.current) audioRef.current.volume = newVolume;
    
    setIsMuted(newVolume === 0);
  };
  
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (videoRef.current) videoRef.current.muted = newMutedState;
    if (audioRef.current) audioRef.current.muted = newMutedState;
  };
  
  const restart = () => {
    seekTo(0);
    if (!isPlaying) togglePlay();
  };
  
  const forward10 = () => {
    if (!videoRef.current) return;
    seekTo(Math.min(videoRef.current.currentTime + 10, duration));
  };
  
  const back10 = () => {
    if (!videoRef.current) return;
    seekTo(Math.max(videoRef.current.currentTime - 10, 0));
  };
  
  // Format time for display (MM:SS)
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Lip sync processing
  const processLipSync = async () => {
    if (!videoRef.current || !audioRef.current || !canvasRef.current) {
      setError('Required video or audio elements not found');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    let progressInterval: NodeJS.Timeout | undefined;
    
    try {
      // Pause playback during processing
      videoRef.current.pause();
      audioRef.current.pause();
      setIsPlaying(false);
      
      // Create a simulated progress indicator
      let currentProgress = 0;
      progressInterval = setInterval(() => {
        currentProgress += 5;
        setProgress(Math.min(currentProgress, 95)); // Cap at 95% until complete
        
        if (currentProgress >= 100) {
          clearInterval(progressInterval);
        }
      }, 200);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Create a simple animation on the canvas to simulate lip-syncing
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || !videoRef.current) {
        throw new Error('Failed to get canvas context or video element');
      }

      // Set canvas dimensions to match video
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      // Draw the video frame on the canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Simulate mouth movement (just a red ellipse for demonstration)
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.7; // Approximate mouth position
      
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 30, 15, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Create a blob from the canvas with proper error handling
      return new Promise<void>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setLipSyncResult(blob);
              setProgress(100);
              
              // Notify parent component
              if (onLipSyncComplete) {
                onLipSyncComplete({ videoBlob: blob });
              }
              resolve();
            } else {
              reject(new Error('Failed to create video blob'));
            }
          },
          'image/jpeg',
          0.95
        );
      });
    } catch (err) {
      console.error('Lip sync processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process lip sync. Please try again.');
      throw err;
    } finally {
      setIsProcessing(false);
      clearInterval(progressInterval);
    }
  };
  
  // Download the lip-synced video
  const downloadResult = () => {
    if (!lipSyncResult) return;
    
    const filename = `lipsync-${character?.name || 'video'}-${new Date().toISOString().slice(0, 10)}.mp4`;
    downloadBlob(lipSyncResult, filename);
  };
  
  return (
    <Card className={responsive ? 'w-full' : 'w-[500px]'}>
      <CardHeader className="pb-2">
        <CardTitle>
          {character ? `${character.name} - Lip Sync` : 'Video Lip Sync'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video display */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            preload="metadata"
            playsInline
          />
          
          {/* Audio element (hidden) */}
          <audio ref={audioRef} className="hidden" />
          
          {/* Canvas for lip-sync processing (hidden) */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlay for lip-sync result if available */}
          {lipSyncResult && (
            <div className="absolute inset-0 bg-black">
              <img 
                src={URL.createObjectURL(lipSyncResult)} 
                alt="Lip sync result"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          {/* Loading/processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <div className="text-white mb-2">Processing lip sync...</div>
              <Progress value={progress} className="w-2/3 h-2" />
              <div className="text-white/80 text-sm mt-2">{progress}%</div>
            </div>
          )}
        </div>
        
        {/* Playback controls */}
        <div className="space-y-2">
          {/* Playback progress */}
          <div className="flex items-center justify-between text-sm">
            <span>{formatTime(currentTime)}</span>
            <Slider
              value={[duration ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSliderChange}
              className="mx-2 flex-1"
              disabled={!duration || isProcessing}
            />
            <span>{formatTime(duration)}</span>
          </div>
          
          {/* Main controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={back10} disabled={isProcessing}>
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="icon" onClick={togglePlay} disabled={isProcessing}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button variant="outline" size="icon" onClick={forward10} disabled={isProcessing}>
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-2 ml-4">
                <Button variant="ghost" size="icon" onClick={toggleMute} disabled={isProcessing}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                  disabled={isProcessing}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {!lipSyncResult ? (
                <Button 
                  onClick={processLipSync} 
                  disabled={isProcessing || !videoSrc || !audioSrc}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Generate Lip Sync
                </Button>
              ) : (
                <Button onClick={downloadResult} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="text-destructive text-sm p-2 bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}