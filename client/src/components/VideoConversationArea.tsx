import React, { useState, useRef, useEffect } from "react";
import { useCharacter } from "@/contexts/CharacterContext";
import { useConversation } from "@/contexts/ConversationContext";
import ConversationControls from "./ConversationControls";
import { processUserInput } from "@/lib/character";
import { createVideoSource, playVideo, downloadBlob } from "@/lib/media";

const VideoConversationArea: React.FC = () => {
  const { selectedCharacter } = useCharacter();
  const { messages, addMessage, isProcessing } = useConversation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShowingVideo, setIsShowingVideo] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("neutral");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Update the video source when the selected character changes
  useEffect(() => {
    if (selectedCharacter && videoRef.current) {
      // In a real implementation, we would get the video URL from the character
      // and use it to set the video source
      setVideoSrc(selectedCharacter.videoUrl);
    }
  }, [selectedCharacter]);

  // Update the current emotion based on the latest message
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.emotion) {
        setCurrentEmotion(latestMessage.emotion);
      }
    }
  }, [messages]);

  // Handle time updates from the video
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle replay button click
  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  // Handle download button click
  const handleDownload = () => {
    // In a real implementation, we would download the current video
    // For now, just show a toast
    alert("Video download functionality would be implemented here");
  };

  // Handle fullscreen button click
  const handleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Process user input (from ConversationControls)
  const handleProcessUserInput = async (input: string) => {
    if (!selectedCharacter || !videoRef.current) return;

    try {
      // Add the user message
      await addMessage({
        role: 'user',
        content: input,
      });

      // Process the input and get a response
      const { assistantMessage, responseVideo } = await processUserInput(
        input,
        selectedCharacter,
        messages,
        videoRef.current
      );

      // Add the assistant message
      await addMessage(assistantMessage);

      // Create a video source URL from the response video
      const videoUrl = createVideoSource(responseVideo);
      setVideoSrc(videoUrl);

      // Play the response video
      if (videoRef.current) {
        await playVideo(videoRef.current, videoUrl);
        setIsShowingVideo(true);
      }
    } catch (error) {
      console.error("Error processing user input:", error);
      // Handle error
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Video Display */}
      <div className="flex-1 flex items-center justify-center bg-gray-900 p-4 overflow-hidden relative">
        {/* Video Container */}
        <div className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleMetadataLoaded}
            poster={selectedCharacter?.thumbnailUrl || "https://via.placeholder.com/1280x720"}
          />
          
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="text-white mt-4 font-medium">Processing response...</p>
                <p className="text-gray-400 text-sm mt-1">This may take a few moments</p>
              </div>
            </div>
          )}
          
          {/* Video Controls */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black to-transparent">
            <div className="flex items-center justify-between">
              <div className="text-white text-sm">
                <span id="currentTime">{formatTime(currentTime)}</span> / <span id="totalTime">{formatTime(duration)}</span>
              </div>
              <div className="flex space-x-4">
                <button 
                  className="text-white hover:text-primary transition" 
                  title="Replay"
                  onClick={handleReplay}
                >
                  <i className="fas fa-redo"></i>
                </button>
                <button 
                  className="text-white hover:text-primary transition" 
                  title="Download"
                  onClick={handleDownload}
                >
                  <i className="fas fa-download"></i>
                </button>
                <button 
                  className="text-white hover:text-primary transition" 
                  title="Fullscreen"
                  onClick={handleFullscreen}
                >
                  <i className="fas fa-expand"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Emotion Indicator */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-md shadow-md px-3 py-2 flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Emotion:</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
            <i className={`fas fa-${getEmotionIcon(currentEmotion)} mr-1`}></i> {capitalizeFirstLetter(currentEmotion)}
          </span>
        </div>
      </div>

      {/* Conversation Controls */}
      <ConversationControls onSendMessage={handleProcessUserInput} />
    </div>
  );
};

// Helper function to get the appropriate icon for an emotion
function getEmotionIcon(emotion: string): string {
  const iconMap: Record<string, string> = {
    happy: "smile",
    sad: "frown",
    angry: "angry",
    surprised: "surprise",
    neutral: "meh",
    excited: "grin-stars",
    curious: "question-circle",
    confused: "confused",
    friendly: "smile"
  };
  
  return iconMap[emotion] || "meh";
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export default VideoConversationArea;
