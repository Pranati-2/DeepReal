import React, { useState } from "react";
import { Character } from "@shared/schema";
import { useCharacter } from "@/contexts/CharacterContext";
import NewCharacterModal from "./modals/NewCharacterModal";
import { Button } from "@/components/ui/button";

const CharacterSidebar: React.FC = () => {
  const { characters, selectedCharacter, selectCharacter } = useCharacter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [contextPrompt, setContextPrompt] = useState(selectedCharacter?.contextPrompt || "");

  const handleNewCharacter = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleChangeContext = () => {
    setIsContextDialogOpen(true);
  };

  const handleSaveContext = () => {
    // In a real implementation, this would update the character's context prompt
    // For now, we'll just update the local state
    setIsContextDialogOpen(false);
  };

  return (
    <>
      <aside className="w-full lg:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Characters</h2>
          
          {/* Character List */}
          <div className="space-y-3">
            {characters.map((character) => (
              <div 
                key={character.id}
                className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition border border-gray-200 dark:border-gray-600 flex items-center space-x-3 ${
                  selectedCharacter?.id === character.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => selectCharacter(character)}
              >
                <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-500 overflow-hidden">
                  <img 
                    src={character.thumbnailUrl || "https://via.placeholder.com/48"} 
                    alt={`${character.name} avatar`} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {character.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {character.description}
                  </p>
                </div>
                {selectedCharacter?.id === character.id && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <Button
              className="w-full"
              onClick={handleNewCharacter}
            >
              <i className="fas fa-plus mr-2"></i> Add New Character
            </Button>
          </div>
        </div>
        
        {/* Context Panel */}
        {selectedCharacter && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Conversation Context</h3>
            <div className="space-y-2">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-sm">
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {selectedCharacter.contextPrompt?.split(':')[0] || "General Conversation"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedCharacter.contextPrompt?.split(':')[1] || "No specific context set"}
                </p>
              </div>
              <button 
                className="text-primary text-sm hover:text-primary-dark transition flex items-center"
                onClick={handleChangeContext}
              >
                <i className="fas fa-edit mr-1"></i> Change Context
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* New Character Modal */}
      <NewCharacterModal isOpen={isModalOpen} onClose={handleCloseModal} />

      {/* Context Dialog */}
      {isContextDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={() => setIsContextDialogOpen(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Conversation Context</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="contextPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Context Prompt</label>
                  <textarea 
                    id="contextPrompt" 
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white" 
                    rows={3}
                    value={contextPrompt}
                    onChange={(e) => setContextPrompt(e.target.value)}
                    placeholder="Set the context for conversation (e.g., 'Teaching Git: Character will teach Git commands and workflows')"
                  ></textarea>
                </div>
              </div>
              <div className="mt-5 flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  onClick={() => setIsContextDialogOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  onClick={handleSaveContext}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CharacterSidebar;
