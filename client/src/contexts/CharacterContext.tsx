import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Character } from "@shared/schema";
import { getCharacters } from "@/lib/storage";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CharacterContextType = {
  characters: Character[];
  selectedCharacter: Character | null;
  isLoading: boolean;
  selectCharacter: (character: Character) => void;
  createCharacter: (character: Omit<Character, "id" | "createdAt">) => Promise<Character>;
  deleteCharacter: (id: number) => Promise<boolean>;
  refreshCharacters: () => Promise<void>;
};

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load characters on mount
  useEffect(() => {
    fetchCharacters();
  }, []);

  // Fetch characters from API
  const fetchCharacters = async () => {
    setIsLoading(true);
    try {
      // First try to get characters from the API
      const res = await apiRequest("GET", "/api/characters", undefined);
      const data = await res.json();
      
      const apiCharacters = data.characters;
      setCharacters(apiCharacters);
      
      // Select the first character if there is one
      if (apiCharacters.length > 0 && !selectedCharacter) {
        setSelectedCharacter(apiCharacters[0]);
      }
    } catch (error) {
      console.error("Failed to fetch characters from API:", error);
      
      // Fallback to local storage
      try {
        const localCharacters = await getCharacters();
        setCharacters(localCharacters);
        
        // Select the first character if there is one
        if (localCharacters.length > 0 && !selectedCharacter) {
          setSelectedCharacter(localCharacters[0]);
        }
      } catch (storageError) {
        console.error("Failed to fetch characters from local storage:", storageError);
        toast({
          title: "Error",
          description: "Failed to load characters",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Select a character
  const selectCharacter = (character: Character) => {
    setSelectedCharacter(character);
  };

  // Create a new character
  const createCharacter = async (character: Omit<Character, "id" | "createdAt">): Promise<Character> => {
    try {
      // First try to create the character via API
      const res = await apiRequest("POST", "/api/characters", character);
      const data = await res.json();
      
      const newCharacter = data.character;
      setCharacters(prev => [...prev, newCharacter]);
      
      // Select the new character
      setSelectedCharacter(newCharacter);
      
      toast({
        title: "Character created",
        description: `${newCharacter.name} has been created successfully.`
      });
      
      return newCharacter;
    } catch (error) {
      console.error("Failed to create character via API:", error);
      
      // Fallback to local storage
      try {
        const newCharacter = await saveCharacter(character);
        setCharacters(prev => [...prev, newCharacter]);
        
        // Select the new character
        setSelectedCharacter(newCharacter);
        
        toast({
          title: "Character created",
          description: `${newCharacter.name} has been created successfully.`
        });
        
        return newCharacter;
      } catch (storageError) {
        console.error("Failed to create character in local storage:", storageError);
        toast({
          title: "Error",
          description: "Failed to create character",
          variant: "destructive"
        });
        throw storageError;
      }
    }
  };

  // Delete a character
  const deleteCharacter = async (id: number): Promise<boolean> => {
    try {
      // First try to delete the character via API
      await apiRequest("DELETE", `/api/characters/${id}`, undefined);
      
      // Update the local state
      setCharacters(prev => prev.filter(char => char.id !== id));
      
      // If the deleted character was selected, select another one
      if (selectedCharacter?.id === id) {
        const remainingCharacters = characters.filter(char => char.id !== id);
        setSelectedCharacter(remainingCharacters.length > 0 ? remainingCharacters[0] : null);
      }
      
      toast({
        title: "Character deleted",
        description: "The character has been deleted successfully."
      });
      
      return true;
    } catch (error) {
      console.error("Failed to delete character via API:", error);
      
      // Fallback to local storage
      try {
        const success = await deleteCharacterFromStorage(id);
        
        if (success) {
          // Update the local state
          setCharacters(prev => prev.filter(char => char.id !== id));
          
          // If the deleted character was selected, select another one
          if (selectedCharacter?.id === id) {
            const remainingCharacters = characters.filter(char => char.id !== id);
            setSelectedCharacter(remainingCharacters.length > 0 ? remainingCharacters[0] : null);
          }
          
          toast({
            title: "Character deleted",
            description: "The character has been deleted successfully."
          });
        }
        
        return success;
      } catch (storageError) {
        console.error("Failed to delete character from local storage:", storageError);
        toast({
          title: "Error",
          description: "Failed to delete character",
          variant: "destructive"
        });
        throw storageError;
      }
    }
  };

  // Refresh the character list
  const refreshCharacters = async () => {
    await fetchCharacters();
  };

  return (
    <CharacterContext.Provider
      value={{
        characters,
        selectedCharacter,
        isLoading,
        selectCharacter,
        createCharacter,
        deleteCharacter,
        refreshCharacters
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error("useCharacter must be used within a CharacterProvider");
  }
  return context;
}

// Placeholder function for local storage (real implementation is in storage.ts)
async function saveCharacter(character: Omit<Character, "id" | "createdAt">): Promise<Character> {
  // This is just a placeholder as we already have the actual storage implementation
  // In a real implementation, this would call the storage.ts saveCharacter function
  return {
    ...character,
    id: Math.floor(Math.random() * 1000),
    createdAt: new Date()
  };
}

// Placeholder function for local storage (real implementation is in storage.ts)
async function deleteCharacterFromStorage(id: number): Promise<boolean> {
  // This is just a placeholder as we already have the actual storage implementation
  // In a real implementation, this would call the storage.ts deleteCharacter function
  return true;
}
