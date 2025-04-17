import { 
  users, 
  characters, 
  conversations, 
  type User, 
  type InsertUser, 
  type Character, 
  type InsertCharacter,
  type Conversation,
  type InsertConversation,
  type Message
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Character methods
  getCharacter(id: number): Promise<Character | undefined>;
  getCharacters(): Promise<Character[]>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character | undefined>;
  deleteCharacter(id: number): Promise<boolean>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByCharacterId(characterId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addMessageToConversation(conversationId: number, message: Message): Promise<Conversation | undefined>;
  clearConversation(conversationId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private characters: Map<number, Character>;
  private conversations: Map<number, Conversation>;
  private userId: number;
  private characterId: number;
  private conversationId: number;

  constructor() {
    this.users = new Map();
    this.characters = new Map();
    this.conversations = new Map();
    this.userId = 1;
    this.characterId = 1;
    this.conversationId = 1;

    // Initialize with some default characters
    this.createCharacter({
      name: "Alex Johnson",
      description: "Tech instructor",
      videoUrl: "https://example.com/videos/alex.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36",
      contextPrompt: "Teaching Git"
    });
    
    this.createCharacter({
      name: "Sarah Chen",
      description: "Language tutor",
      videoUrl: "https://example.com/videos/sarah.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2",
      contextPrompt: "Teaching Spanish"
    });

    this.createCharacter({
      name: "Raj Patel",
      description: "Fitness coach",
      videoUrl: "https://example.com/videos/raj.mp4",
      thumbnailUrl: "https://images.unsplash.com/photo-1602752158459-322663e8525c",
      contextPrompt: "Fitness training"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Character methods
  async getCharacter(id: number): Promise<Character | undefined> {
    return this.characters.get(id);
  }

  async getCharacters(): Promise<Character[]> {
    return Array.from(this.characters.values());
  }

  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const id = this.characterId++;
    const now = new Date();
    const character: Character = { 
      ...insertCharacter, 
      id, 
      createdAt: now
    };
    this.characters.set(id, character);
    return character;
  }

  async updateCharacter(id: number, characterUpdate: Partial<InsertCharacter>): Promise<Character | undefined> {
    const character = this.characters.get(id);
    if (!character) return undefined;
    
    const updatedCharacter: Character = { 
      ...character, 
      ...characterUpdate
    };
    this.characters.set(id, updatedCharacter);
    return updatedCharacter;
  }

  async deleteCharacter(id: number): Promise<boolean> {
    return this.characters.delete(id);
  }

  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByCharacterId(characterId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (conversation) => conversation.characterId === characterId
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationId++;
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async addMessageToConversation(conversationId: number, message: Message): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return undefined;
    
    const updatedConversation: Conversation = {
      ...conversation,
      messages: [...conversation.messages, message]
    };
    this.conversations.set(conversationId, updatedConversation);
    return updatedConversation;
  }

  async clearConversation(conversationId: number): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;
    
    const clearedConversation: Conversation = {
      ...conversation,
      messages: []
    };
    this.conversations.set(conversationId, clearedConversation);
    return true;
  }
}

export const storage = new MemStorage();
