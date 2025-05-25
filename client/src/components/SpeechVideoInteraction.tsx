import React, { useState, useRef, useEffect } from 'react';
import { SpeechEngine } from './SpeechEngine';
import { VideoInteraction } from './VideoInteraction';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Video, Settings } from 'lucide-react';
import { Character } from '@shared/schema';

interface SpeechVideoInteractionProps {
  character?: Character;
  videoSrc?: string;
  onTranscript?: (text: string, emotion: string) => void;
  onResponse?: (text: string, emotion: string) => void;
}

export function SpeechVideoInteraction({
  character,
  videoSrc,
  onTranscript,
  onResponse
}: SpeechVideoInteractionProps) {
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSpeechTranscript = (text: string, emotion: string) => {
    setCurrentEmotion(emotion);
    if (onTranscript) {
      onTranscript(text, emotion);
    }
  };

  const handleSpeechResponse = (text: string, emotion: string) => {
    setCurrentEmotion(emotion);
    if (onResponse) {
      onResponse(text, emotion);
    }
  };

  const toggleSpeech = () => {
    setIsSpeechActive(!isSpeechActive);
    if (!isSpeechActive) {
      setIsVideoActive(false);
    }
  };

  const toggleVideo = () => {
    setIsVideoActive(!isVideoActive);
    if (!isVideoActive) {
      setIsSpeechActive(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-center gap-4 mb-4">
        <Button
          variant={isSpeechActive ? "default" : "outline"}
          onClick={toggleSpeech}
          className="flex items-center gap-2"
        >
          <Mic className="w-4 h-4" />
          {isSpeechActive ? "Stop Speech" : "Start Speech"}
        </Button>
        <Button
          variant={isVideoActive ? "default" : "outline"}
          onClick={toggleVideo}
          className="flex items-center gap-2"
        >
          <Video className="w-4 h-4" />
          {isVideoActive ? "Stop Video" : "Start Video"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <SpeechEngine
              onTranscript={handleSpeechTranscript}
              onResponse={handleSpeechResponse}
              isActive={isSpeechActive}
              characterVoice={character?.voiceType || 'default'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <VideoInteraction
              character={character}
              videoSrc={videoSrc}
              onClose={() => setIsVideoActive(false)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 