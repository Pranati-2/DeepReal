import { Character, Conversation, Message } from "@shared/schema";

// IndexedDB Database name and version
const DB_NAME = 'deepreal-db';
const DB_VERSION = 2; // Increment version to add YouTube videos store

// IndexedDB Object Stores
const CHARACTERS_STORE = 'characters';
const CONVERSATIONS_STORE = 'conversations';
const VIDEO_STORE = 'videos';
const YOUTUBE_VIDEOS_STORE = 'youtubeVideos';

// Open the IndexedDB database
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      reject(new Error('Failed to open database'));
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(CHARACTERS_STORE)) {
        const characterStore = db.createObjectStore(CHARACTERS_STORE, { keyPath: 'id', autoIncrement: true });
        characterStore.createIndex('name', 'name', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const conversationStore = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id', autoIncrement: true });
        conversationStore.createIndex('characterId', 'characterId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
      }
      
      // Add YouTube videos store if it doesn't exist
      if (!db.objectStoreNames.contains(YOUTUBE_VIDEOS_STORE)) {
        db.createObjectStore(YOUTUBE_VIDEOS_STORE, { keyPath: 'videoId' });
      }
    };
  });
}

// Character Storage Operations
export async function saveCharacter(character: Omit<Character, 'id'>): Promise<Character> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARACTERS_STORE], 'readwrite');
    const store = transaction.objectStore(CHARACTERS_STORE);
    
    // Add the character to the store
    const request = store.add({
      ...character,
      createdAt: new Date()
    });
    
    request.onsuccess = (event) => {
      const id = request.result as number;
      resolve({
        ...character,
        id,
        createdAt: new Date()
      } as Character);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to save character'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getCharacters(): Promise<Character[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARACTERS_STORE], 'readonly');
    const store = transaction.objectStore(CHARACTERS_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get characters'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getCharacterById(id: number): Promise<Character | null> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARACTERS_STORE], 'readonly');
    const store = transaction.objectStore(CHARACTERS_STORE);
    const request = store.get(id);
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get character'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function deleteCharacter(id: number): Promise<boolean> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARACTERS_STORE], 'readwrite');
    const store = transaction.objectStore(CHARACTERS_STORE);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve(true);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to delete character'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Conversation Storage Operations
export async function saveConversation(conversation: Omit<Conversation, 'id'>): Promise<Conversation> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    
    // Add the conversation to the store
    const request = store.add({
      ...conversation,
      createdAt: new Date()
    });
    
    request.onsuccess = () => {
      const id = request.result as number;
      resolve({
        ...conversation,
        id,
        createdAt: new Date()
      } as Conversation);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to save conversation'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getConversationsByCharacterId(characterId: number): Promise<Conversation[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const index = store.index('characterId');
    const request = index.getAll(characterId);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get conversations'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function addMessageToConversation(conversationId: number, message: Message): Promise<Conversation> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.get(conversationId);
    
    request.onsuccess = () => {
      const conversation = request.result as Conversation;
      if (!conversation) {
        reject(new Error('Conversation not found'));
        return;
      }
      
      // Add the message to the conversation
      conversation.messages = [...conversation.messages, message];
      
      // Update the conversation in the store
      const updateRequest = store.put(conversation);
      
      updateRequest.onsuccess = () => {
        resolve(conversation);
      };
      
      updateRequest.onerror = () => {
        reject(new Error('Failed to add message to conversation'));
      };
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get conversation'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// Video Storage Operations
export async function saveVideo(id: string, videoBlob: Blob): Promise<string> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VIDEO_STORE], 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);
    
    // Add the video to the store
    const request = store.put({ id, data: videoBlob });
    
    request.onsuccess = () => {
      resolve(id);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to save video'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getVideo(id: string): Promise<Blob | null> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VIDEO_STORE], 'readonly');
    const store = transaction.objectStore(VIDEO_STORE);
    const request = store.get(id);
    
    request.onsuccess = () => {
      if (!request.result) {
        resolve(null);
        return;
      }
      
      resolve(request.result.data);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get video'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function deleteVideo(id: string): Promise<boolean> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VIDEO_STORE], 'readwrite');
    const store = transaction.objectStore(VIDEO_STORE);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve(true);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to delete video'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// LocalStorage helpers for settings and preferences
export function saveSettings(settings: Record<string, any>): void {
  localStorage.setItem('deepreal-settings', JSON.stringify(settings));
}

export function getSettings(): Record<string, any> {
  const settings = localStorage.getItem('deepreal-settings');
  return settings ? JSON.parse(settings) : {};
}

// YouTube Video Storage Operations
export interface YouTubeVideoData {
  videoId: string;
  title: string;
  transcript: string;
  summary: string;
  topics: string[];
  thumbnailUrl?: string;
  channelTitle?: string;
  addedAt: Date;
}

export async function saveYouTubeVideo(videoData: Omit<YouTubeVideoData, 'addedAt'>): Promise<YouTubeVideoData> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([YOUTUBE_VIDEOS_STORE], 'readwrite');
    const store = transaction.objectStore(YOUTUBE_VIDEOS_STORE);
    
    // Add the video data to the store
    const data = {
      ...videoData,
      addedAt: new Date()
    };
    
    const request = store.put(data);
    
    request.onsuccess = () => {
      resolve(data);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to save YouTube video data'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getYouTubeVideo(videoId: string): Promise<YouTubeVideoData | null> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([YOUTUBE_VIDEOS_STORE], 'readonly');
    const store = transaction.objectStore(YOUTUBE_VIDEOS_STORE);
    const request = store.get(videoId);
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get YouTube video data'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getAllYouTubeVideos(): Promise<YouTubeVideoData[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([YOUTUBE_VIDEOS_STORE], 'readonly');
    const store = transaction.objectStore(YOUTUBE_VIDEOS_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to get all YouTube videos'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function deleteYouTubeVideo(videoId: string): Promise<boolean> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([YOUTUBE_VIDEOS_STORE], 'readwrite');
    const store = transaction.objectStore(YOUTUBE_VIDEOS_STORE);
    const request = store.delete(videoId);
    
    request.onsuccess = () => {
      resolve(true);
    };
    
    request.onerror = () => {
      reject(new Error('Failed to delete YouTube video'));
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}
