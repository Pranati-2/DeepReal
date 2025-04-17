import React, { useState, useRef } from "react";
import { useConversation } from "@/contexts/ConversationContext";
import ConversationHistoryPanel from "./panels/ConversationHistoryPanel";
import { recordAudio } from "@/lib/media";
import { speechToText } from "@/lib/character";
import { useToast } from "@/hooks/use-toast";

interface ConversationControlsProps {
  onSendMessage: (message: string) => Promise<void>;
}

const ConversationControls: React.FC<ConversationControlsProps> = ({ onSendMessage }) => {
  const [userInput, setUserInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const recorderRef = useRef<{ start: () => void; stop: () => Promise<Blob> } | null>(null);
  const { isProcessing } = useConversation();
  const { toast } = useToast();

  // Initialize or get recorder
  const getRecorder = async () => {
    if (!recorderRef.current) {
      try {
        recorderRef.current = await recordAudio();
      } catch (error) {
        console.error("Failed to initialize recorder:", error);
        toast({
          title: "Microphone Error",
          description: "Could not access your microphone. Please check permissions.",
          variant: "destructive"
        });
        return null;
      }
    }
    return recorderRef.current;
  };

  // Toggle microphone recording
  const toggleMicrophone = async () => {
    if (isProcessing) return;

    try {
      if (isRecording) {
        setIsRecording(false);
        
        // Get the recorder and stop recording
        const recorder = await getRecorder();
        if (!recorder) return;
        
        const audioBlob = await recorder.stop();
        
        // Convert speech to text
        const text = await speechToText(audioBlob);
        
        if (text) {
          setUserInput(text);
          // Automatically send the message if it's not empty
          await handleSendMessage(text);
        } else {
          toast({
            title: "No Speech Detected",
            description: "We couldn't detect any speech. Please try speaking more clearly.",
            variant: "destructive"
          });
        }
      } else {
        // Get the recorder and start recording
        const recorder = await getRecorder();
        if (!recorder) return;
        
        recorder.start();
        setIsRecording(true);
      }
    } catch (error) {
      console.error("Error with speech recording:", error);
      setIsRecording(false);
      toast({
        title: "Speech Recognition Error",
        description: "An error occurred with speech recognition. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Send a message
  const handleSendMessage = async (text: string = userInput) => {
    if (!text.trim() || isProcessing) return;
    
    try {
      await onSendMessage(text);
      setUserInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Clear the input field
  const clearInput = () => {
    setUserInput("");
  };

  // Toggle the conversation history panel
  const toggleHistory = () => {
    setIsHistoryVisible(!isHistoryVisible);
  };

  // Open settings
  const openSettings = () => {
    toast({
      title: "Settings",
      description: "Settings panel is not implemented in this version."
    });
  };

  // Handle language change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(e.target.value);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Conversation History Toggle */}
          <div className="flex justify-between items-center mb-3">
            <button 
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center"
              onClick={toggleHistory}
            >
              <i className="fas fa-history mr-1"></i> Show Conversation History
            </button>
            <div className="flex space-x-2">
              <select 
                className="text-xs rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                value={selectedLanguage}
                onChange={handleLanguageChange}
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>Mandarin</option>
                <option>Hindi</option>
              </select>
              <button 
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" 
                title="Settings"
                onClick={openSettings}
              >
                <i className="fas fa-sliders-h"></i>
              </button>
            </div>
          </div>
          
          {/* Input Area */}
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Type your message or click microphone to speak..." 
                className="w-full rounded-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 pr-10 py-3 focus:ring-primary focus:border-primary dark:text-white" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isProcessing || isRecording}
              />
              {userInput && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button 
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    onClick={clearInput}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}
            </div>
            
            <button 
              className={`flex items-center justify-center h-10 w-10 rounded-full ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-primary hover:bg-primary-dark'
              } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors`}
              onClick={toggleMicrophone}
              disabled={isProcessing}
            >
              <i className="fas fa-microphone"></i>
            </button>
            
            <button 
              className="flex items-center justify-center h-10 w-10 rounded-full bg-primary hover:bg-primary-dark text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              onClick={() => handleSendMessage()}
              disabled={!userInput.trim() || isProcessing || isRecording}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
          
          {/* Recording Indicator */}
          {isRecording && (
            <div className="mt-3 text-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                <span className="flex h-3 w-3 relative mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Recording... Speak now
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversation History Panel */}
      <ConversationHistoryPanel isVisible={isHistoryVisible} onClose={toggleHistory} />
    </>
  );
};

export default ConversationControls;
