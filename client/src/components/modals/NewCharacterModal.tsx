import React, { useState } from "react";
import { useCharacter } from "@/contexts/CharacterContext";
import { extractThumbnail } from "@/lib/media";
import { useToast } from "@/hooks/use-toast";

interface NewCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewCharacterModal: React.FC<NewCharacterModalProps> = ({ isOpen, onClose }) => {
  const [characterName, setCharacterName] = useState("");
  const [characterDescription, setCharacterDescription] = useState("");
  const [videoSource, setVideoSource] = useState<"upload" | "link">("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [contextPrompt, setContextPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createCharacter } = useCharacter();
  const { toast } = useToast();

  const resetForm = () => {
    setCharacterName("");
    setCharacterDescription("");
    setVideoSource("upload");
    setVideoFile(null);
    setVideoUrl("");
    setContextPrompt("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!characterName || !characterDescription) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and description for your character.",
        variant: "destructive"
      });
      return;
    }
    
    if (videoSource === "upload" && !videoFile) {
      toast({
        title: "Missing Video",
        description: "Please upload a video file for your character.",
        variant: "destructive"
      });
      return;
    }
    
    if (videoSource === "link" && !videoUrl) {
      toast({
        title: "Missing Video URL",
        description: "Please provide a URL to a video for your character.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let finalVideoUrl = "";
      let thumbnailUrl = "";
      
      if (videoSource === "upload" && videoFile) {
        // In a real implementation, we would upload the video to a server
        // or store it in IndexedDB and get a local URL
        
        // Extract a thumbnail from the video
        thumbnailUrl = await extractThumbnail(videoFile);
        
        // Store the video URL (client-side storage or file upload would happen here)
        finalVideoUrl = URL.createObjectURL(videoFile);
      } else if (videoSource === "link" && videoUrl) {
        finalVideoUrl = videoUrl;
        // For video links, we'd normally fetch a frame for the thumbnail
        // For now, use a placeholder
        thumbnailUrl = "https://via.placeholder.com/320x180";
      }
      
      // Create the character
      await createCharacter({
        name: characterName,
        description: characterDescription,
        videoUrl: finalVideoUrl,
        thumbnailUrl,
        contextPrompt
      });
      
      // Reset the form and close the modal
      resetForm();
      onClose();
      
      toast({
        title: "Character Created",
        description: `${characterName} has been created successfully.`
      });
    } catch (error) {
      console.error("Error creating character:", error);
      toast({
        title: "Error",
        description: "There was an error creating your character. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add New Character</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="characterName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input 
                  type="text" 
                  id="characterName" 
                  name="characterName" 
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white" 
                  placeholder="Character name"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label htmlFor="characterDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <input 
                  type="text" 
                  id="characterDescription" 
                  name="characterDescription" 
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white" 
                  placeholder="Brief description"
                  value={characterDescription}
                  onChange={(e) => setCharacterDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video Source</label>
                <div className="mt-1 flex items-center space-x-4">
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="uploadVideo" 
                      name="videoSource" 
                      value="upload" 
                      className="focus:ring-primary h-4 w-4 text-primary border-gray-300 dark:border-gray-600" 
                      checked={videoSource === "upload"}
                      onChange={() => setVideoSource("upload")}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="uploadVideo" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Upload video</label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="videoLink" 
                      name="videoSource" 
                      value="link" 
                      className="focus:ring-primary h-4 w-4 text-primary border-gray-300 dark:border-gray-600"
                      checked={videoSource === "link"}
                      onChange={() => setVideoSource("link")}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="videoLink" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Video link</label>
                  </div>
                </div>
              </div>
              
              {videoSource === "upload" && (
                <div>
                  <label htmlFor="videoFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload Video</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label htmlFor="videoFile" className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                          <span>Upload a file</span>
                          <input 
                            id="videoFile" 
                            name="videoFile" 
                            type="file" 
                            className="sr-only" 
                            accept="video/*"
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        MP4, WebM, or AVI up to 100MB
                      </p>
                      {videoFile && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Selected file: {videoFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {videoSource === "link" && (
                <div>
                  <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video URL</label>
                  <input 
                    type="text" 
                    id="videoUrl" 
                    name="videoUrl" 
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white" 
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="contextPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Context Prompt</label>
                <textarea 
                  id="contextPrompt" 
                  name="contextPrompt" 
                  rows={3} 
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white" 
                  placeholder="Set the context for conversation (e.g., 'Teaching Git: Character will teach Git commands and workflows')"
                  value={contextPrompt}
                  onChange={(e) => setContextPrompt(e.target.value)}
                  disabled={isSubmitting}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-5 flex justify-end space-x-3">
              <button 
                type="button" 
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Creating...
                  </>
                ) : (
                  'Create Character'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewCharacterModal;
