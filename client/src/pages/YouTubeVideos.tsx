import React, { useState, useEffect } from 'react';
import Header from "@/components/Header";
import { YoutubeVideoPanel } from "@/components/YoutubeVideoPanel";
import { YoutubeConversation } from "@/components/YoutubeConversation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllYouTubeVideos, YouTubeVideoData, deleteYouTubeVideo, saveYouTubeVideo } from "@/lib/storage";
import { PlusCircle, Trash2, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const YouTubeVideos: React.FC = () => {
  const [videoData, setVideoData] = useState<YouTubeVideoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  
  // Load videos on component mount
  useEffect(() => {
    loadVideos();
  }, []);
  
  // Load videos from storage
  const loadVideos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const videos = await getAllYouTubeVideos();
      setVideoData(videos);
    } catch (err) {
      console.error('Error loading YouTube videos:', err);
      setError('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle video processing
  const handleVideoProcessed = async (data: Omit<YouTubeVideoData, 'addedAt'>) => {
    try {
      await saveYouTubeVideo(data);
      await loadVideos();
      setIsAddingVideo(false);
    } catch (err) {
      console.error('Error saving video:', err);
      setError('Failed to save video');
    }
  };
  
  // Delete a video
  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteYouTubeVideo(videoId);
      await loadVideos();
      if (selectedVideoId === videoId) {
        setSelectedVideoId(null);
      }
    } catch (err) {
      console.error('Error deleting video:', err);
      setError('Failed to delete video');
    }
  };
  
  // Start conversation with a video
  const handleStartConversation = (videoId: string) => {
    setSelectedVideoId(videoId);
  };
  
  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <main className="flex-1 container mx-auto py-6 px-4 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">YouTube Video Conversations</h1>
        
        <Tabs defaultValue={selectedVideoId ? "conversation" : "library"} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="library">Video Library</TabsTrigger>
              {selectedVideoId && (
                <TabsTrigger value="conversation">Active Conversation</TabsTrigger>
              )}
            </TabsList>
            
            <Button
              onClick={() => setIsAddingVideo(!isAddingVideo)}
              variant={isAddingVideo ? "outline" : "default"}
            >
              {isAddingVideo ? 'Cancel' : 'Add YouTube Video'}
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <TabsContent value="library" className="space-y-6">
            {isAddingVideo && (
              <div className="mb-6">
                <YoutubeVideoPanel onVideoProcessed={handleVideoProcessed} />
              </div>
            )}
            
            {isLoading ? (
              <div>Loading videos...</div>
            ) : videoData.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Videos Added</CardTitle>
                  <CardDescription>
                    Add a YouTube video to start having interactive conversations about its content.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsAddingVideo(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add YouTube Video
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoData.map((video) => (
                  <Card key={video.videoId}>
                    <div className="aspect-video overflow-hidden relative rounded-t-lg">
                      <img 
                        src={video.thumbnailUrl || `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{video.title}</CardTitle>
                      <CardDescription>{video.channelTitle || 'YouTube Channel'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-2 mb-4">{video.summary}</p>
                      <div className="flex space-x-2">
                        <Button 
                          variant="default" 
                          onClick={() => handleStartConversation(video.videoId)}
                          className="flex-1"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Talk
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteVideo(video.videoId)}
                          className="px-3"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {selectedVideoId && (
            <TabsContent value="conversation">
              <YoutubeConversation 
                videoId={selectedVideoId} 
                onClose={() => setSelectedVideoId(null)} 
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default YouTubeVideos;