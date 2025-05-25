import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
// @ts-ignore
import gTTS from 'node-gtts';

const execAsync = promisify(exec);

export type VoiceProfile = {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
};

export class TextToSpeechService {
  private voiceProfiles: Map<string, VoiceProfile>;
  private defaultVoice: VoiceProfile;

  constructor() {
    this.voiceProfiles = new Map();
    
    // Initialize default voice profile
    this.defaultVoice = {
      id: 'default',
      name: 'Default Voice',
      language: 'en',
      gender: 'female'
    };
    
    this.voiceProfiles.set(this.defaultVoice.id, this.defaultVoice);
    
    // Add some additional voice profiles
    this.addVoiceProfile({
      id: 'en-us',
      name: 'English (US)',
      language: 'en',
      gender: 'female'
    });
    
    this.addVoiceProfile({
      id: 'en-uk',
      name: 'English (UK)',
      language: 'en-gb',
      gender: 'male'
    });
    
    this.addVoiceProfile({
      id: 'es',
      name: 'Spanish',
      language: 'es',
      gender: 'female'
    });
    
    this.addVoiceProfile({
      id: 'fr',
      name: 'French',
      language: 'fr',
      gender: 'female'
    });
  }

  async synthesizeSpeech(text: string, voiceProfileId: string = 'default'): Promise<Buffer> {
    try {
      const voiceProfile = this.voiceProfiles.get(voiceProfileId) || this.defaultVoice;
      
      // Create a temporary file for the audio
      const outputFile = path.join(process.cwd(), 'temp', `${Date.now()}.mp3`);
      
      await fs.mkdir(path.dirname(outputFile), { recursive: true });

      // Use gTTS to generate speech
      const gtts = new gTTS(voiceProfile.language);
      
      return new Promise((resolve, reject) => {
        gtts.save(outputFile, text, (err: Error | null) => {
          if (err) {
            console.error('TTS generation error:', err);
            reject(new Error('Speech synthesis failed'));
            return;
          }
          
          // Read the generated audio file
          fs.readFile(outputFile)
            .then(audioBuffer => {
              // Clean up temporary file
              fs.unlink(outputFile)
                .catch(cleanupError => console.error('Cleanup error:', cleanupError));
              
              resolve(audioBuffer);
            })
            .catch(readError => {
              console.error('Error reading audio file:', readError);
              reject(new Error('Failed to read synthesized speech'));
            });
        });
      });
    } catch (error) {
      console.error('Text to speech error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  addVoiceProfile(profile: VoiceProfile): void {
    this.voiceProfiles.set(profile.id, profile);
  }

  getVoiceProfile(profileId: string): VoiceProfile | undefined {
    return this.voiceProfiles.get(profileId);
  }

  listVoiceProfiles(): VoiceProfile[] {
    return Array.from(this.voiceProfiles.values());
  }

  removeVoiceProfile(profileId: string): boolean {
    if (profileId === 'default') {
      throw new Error('Cannot remove default voice profile');
    }
    return this.voiceProfiles.delete(profileId);
  }
} 