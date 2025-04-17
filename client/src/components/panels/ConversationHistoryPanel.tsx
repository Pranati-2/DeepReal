import React from "react";
import { useCharacter } from "@/contexts/CharacterContext";
import { useConversation } from "@/contexts/ConversationContext";
import { downloadBlob, generateConversationBlob } from "@/lib/character";

interface ConversationHistoryPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const ConversationHistoryPanel: React.FC<ConversationHistoryPanelProps> = ({ isVisible, onClose }) => {
  const { selectedCharacter } = useCharacter();
  const { messages } = useConversation();

  // Format the timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get the relative time (e.g., "2 minutes ago")
  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    
    if (seconds < 60) return "Just now";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  // Handle export conversation
  const handleExportConversation = () => {
    if (!selectedCharacter) return;
    
    const filename = `conversation-with-${selectedCharacter.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    const blob = generateConversationBlob(selectedCharacter, messages);
    
    downloadBlob(blob, filename);
  };

  return (
    <div className={`fixed inset-y-0 right-0 z-40 w-80 bg-white dark:bg-gray-800 shadow-lg transform ${
      isVisible ? 'translate-x-0' : 'translate-x-full'
    } transition-transform duration-300 ease-in-out`}>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Conversation History</h3>
          <button 
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={onClose}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex items-start ${
                    message.role === 'user' ? 'flex-row-reverse space-x-3 space-x-reverse' : 'space-x-3'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
                    message.role === 'user' 
                      ? 'bg-blue-100 flex items-center justify-center' 
                      : 'bg-gray-300 overflow-hidden'
                  }`}>
                    {message.role === 'user' ? (
                      <i className="fas fa-user text-blue-600"></i>
                    ) : (
                      <img 
                        src={selectedCharacter?.thumbnailUrl || "https://via.placeholder.com/48"} 
                        alt="Character" 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                  <div className={`flex-1 ${
                    message.role === 'user' 
                      ? 'bg-blue-50 dark:bg-blue-900' 
                      : 'bg-gray-50 dark:bg-gray-700'
                  } rounded-lg p-3`}>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {message.content}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {getRelativeTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button 
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={handleExportConversation}
            disabled={messages.length === 0}
          >
            <i className="fas fa-download mr-2"></i> Export Conversation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationHistoryPanel;
