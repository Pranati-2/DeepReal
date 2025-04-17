import React from "react";
import Header from "@/components/Header";
import CharacterSidebar from "@/components/CharacterSidebar";
import VideoConversationArea from "@/components/VideoConversationArea";
import { CharacterProvider } from "@/contexts/CharacterContext";
import { ConversationProvider } from "@/contexts/ConversationContext";

const Home: React.FC = () => {
  return (
    <CharacterProvider>
      <ConversationProvider>
        <div className="flex flex-col h-screen">
          <Header />
          
          <main className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col lg:flex-row">
              <CharacterSidebar />
              <VideoConversationArea />
            </div>
          </main>
        </div>
      </ConversationProvider>
    </CharacterProvider>
  );
};

export default Home;
