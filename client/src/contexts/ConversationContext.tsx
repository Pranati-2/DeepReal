import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Character, Conversation, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCharacter } from "./CharacterContext";
import { addMessageToConversation, getConversationsByCharacterId, saveConversation } from "@/lib/storage";

type ConversationContextType = {
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isProcessing: boolean;
  addMessage: (message: Omit<Message, "timestamp">) => Promise<Message>;
  clearConversation: () => Promise<void>;
  getConversations: (characterId: number) => Promise<Conversation[]>;
};

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { selectedCharacter } = useCharacter();
  const { toast } = useToast();

  // Initialize or load conversation when the selected character changes
  useEffect(() => {
    if (selectedCharacter) {
      initializeConversation(selectedCharacter.id);
    } else {
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [selectedCharacter]);

  // Initialize conversation for a character
  const initializeConversation = async (characterId: number) => {
    setIsLoading(true);
    try {
      // First try to get conversations from the API
      const res = await apiRequest("GET", `/api/characters/${characterId}/conversations`, undefined);
      const data = await res.json();
      
      let conversation: Conversation;
      
      if (data.conversations && data.conversations.length > 0) {
        // Use the most recent conversation
        conversation = data.conversations.sort((a: Conversation, b: Conversation) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })[0];
      } else {
        // Create a new conversation
        const newConversationRes = await apiRequest("POST", "/api/conversations", {
          characterId,
          messages: []
        });
        
        const newConversationData = await newConversationRes.json();
        conversation = newConversationData.conversation;
      }
      
      setCurrentConversation(conversation);
      setMessages(conversation.messages);
    } catch (error) {
      console.error("Failed to fetch conversations from API:", error);
      
      // Fallback to local storage
      try {
        const localConversations = await getConversationsByCharacterId(characterId);
        
        let conversation: Conversation;
        
        if (localConversations.length > 0) {
          // Use the most recent conversation
          conversation = localConversations.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })[0];
        } else {
          // Create a new conversation
          conversation = await saveConversation({
            characterId,
            messages: []
          });
        }
        
        setCurrentConversation(conversation);
        setMessages(conversation.messages);
      } catch (storageError) {
        console.error("Failed to fetch conversations from local storage:", storageError);
        toast({
          title: "Error",
          description: "Failed to load conversation",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add a message to the current conversation
  const addMessage = async (messageData: Omit<Message, "timestamp">): Promise<Message> => {
    if (!currentConversation) {
      throw new Error("No active conversation");
    }
    
    setIsProcessing(true);
    
    try {
      const message: Message = {
        ...messageData,
        timestamp: Date.now()
      };
      
      // First try to add the message via API
      try {
        const res = await apiRequest(
          "POST", 
          `/api/conversations/${currentConversation.id}/messages`, 
          message
        );
        const data = await res.json();
        
        // Update the local state
        setMessages(prev => [...prev, message]);
        
        setIsProcessing(false);
        return message;
      } catch (error) {
        console.error("Failed to add message via API:", error);
        
        // Fallback to local storage
        try {
          await addMessageToConversation(currentConversation.id, message);
          
          // Update the local state
          setMessages(prev => [...prev, message]);
          
          setIsProcessing(false);
          return message;
        } catch (storageError) {
          console.error("Failed to add message to local storage:", storageError);
          toast({
            title: "Error",
            description: "Failed to save message",
            variant: "destructive"
          });
          throw storageError;
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear the current conversation
  const clearConversation = async (): Promise<void> => {
    if (!currentConversation) {
      return;
    }
    
    try {
      // First try to clear the conversation via API
      await apiRequest("DELETE", `/api/conversations/${currentConversation.id}/messages`, undefined);
      
      // Update the local state
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear conversation via API:", error);
      
      // Fallback to local storage - just reset the messages array
      setMessages([]);
      
      toast({
        title: "Conversation cleared",
        description: "All messages have been cleared."
      });
    }
  };

  // Get all conversations for a character
  const getConversations = async (characterId: number): Promise<Conversation[]> => {
    try {
      // First try to get conversations from the API
      const res = await apiRequest("GET", `/api/characters/${characterId}/conversations`, undefined);
      const data = await res.json();
      
      return data.conversations || [];
    } catch (error) {
      console.error("Failed to fetch conversations from API:", error);
      
      // Fallback to local storage
      try {
        return await getConversationsByCharacterId(characterId);
      } catch (storageError) {
        console.error("Failed to fetch conversations from local storage:", storageError);
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive"
        });
        return [];
      }
    }
  };

  return (
    <ConversationContext.Provider
      value={{
        currentConversation,
        messages,
        isLoading,
        isProcessing,
        addMessage,
        clearConversation,
        getConversations
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return context;
}
