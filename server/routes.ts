import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCharacterSchema, 
  insertConversationSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import aiRoutes from "./routes/ai";

export async function registerRoutes(app: Express): Promise<Server> {
  // AI Routes
  app.use("/api/ai", aiRoutes);

  // Characters API
  app.get("/api/characters", async (req, res) => {
    try {
      const characters = await storage.getCharacters();
      res.json({ characters });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch characters" });
    }
  });

  app.get("/api/characters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid character ID" });
      }

      const character = await storage.getCharacter(id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      res.json({ character });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch character" });
    }
  });

  app.post("/api/characters", async (req, res) => {
    try {
      const characterData = insertCharacterSchema.parse(req.body);
      const character = await storage.createCharacter(characterData);
      res.status(201).json({ character });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid character data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create character" });
    }
  });

  app.delete("/api/characters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid character ID" });
      }

      const success = await storage.deleteCharacter(id);
      if (!success) {
        return res.status(404).json({ message: "Character not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete character" });
    }
  });

  // Conversations API
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.json({ conversation });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get("/api/characters/:characterId/conversations", async (req, res) => {
    try {
      const characterId = parseInt(req.params.characterId);
      if (isNaN(characterId)) {
        return res.status(400).json({ message: "Invalid character ID" });
      }

      const conversations = await storage.getConversationsByCharacterId(characterId);
      res.json({ conversations });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      
      // Check if character exists
      const character = await storage.getCharacter(conversationData.characterId as number);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }

      const conversation = await storage.createConversation(conversationData);
      res.status(201).json({ conversation });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const { content, role, emotion } = req.body;
      if (!content || !role) {
        return res.status(400).json({ message: "Message content and role are required" });
      }

      const message = {
        content,
        role,
        emotion,
        timestamp: Date.now()
      };

      // Ensure the conversation exists before adding a message
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Now we know the conversation exists, so we can safely add the message
      // Use type assertion to tell TypeScript that id is definitely a number
      const updatedConversation = await storage.addMessageToConversation(id as number, message);
      res.json({ conversation: updatedConversation, message });
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ message: "Failed to add message to conversation" });
    }
  });

  app.delete("/api/conversations/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const success = await storage.clearConversation(id);
      if (!success) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear conversation" });
    }
  });

  // File upload endpoint (only handles metadata, actual upload is client-side)
  app.post("/api/upload", (req, res) => {
    // In the real implementation, this would handle the video upload
    // For now, we'll just return success
    res.json({ success: true, url: "client-side-storage" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
