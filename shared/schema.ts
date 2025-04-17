import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  contextPrompt: text("context_prompt"),
  voiceType: text("voice_type"),
  lipsyncProfile: text("lipsync_profile"),
  emotionProfile: text("emotion_profile"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").references(() => characters.id),
  messages: jsonb("messages").notNull().$type<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    emotion?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCharacterSchema = createInsertSchema(characters).pick({
  name: true,
  description: true,
  videoUrl: true,
  thumbnailUrl: true,
  contextPrompt: true,
  voiceType: true,
  lipsyncProfile: true,
  emotionProfile: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  characterId: true,
  messages: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  emotion?: string;
};
