import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';

const execAsync = promisify(exec);

export class SpeechToTextService {
  private whisperPath: string;
  private modelPath: string;

  constructor() {
    // These paths should be configurable through environment variables
    this.whisperPath = process.env.WHISPER_PATH || 'whisper';
    this.modelPath = process.env.WHISPER_MODEL_PATH || path.join(process.cwd(), 'models', 'ggml-base.bin');
  }

  async transcribe(audioFilePath: string): Promise<string> {
    try {
      // Ensure the audio file exists
      await fs.access(audioFilePath);

      // Run whisper.cpp command
      const { stdout, stderr } = await execAsync(
        `${this.whisperPath} -m ${this.modelPath} -f ${audioFilePath} -otxt`
      );

      if (stderr) {
        console.error('Whisper transcription error:', stderr);
        throw new Error('Transcription failed');
      }

      // Read the output text file
      const outputPath = `${audioFilePath}.txt`;
      const transcription = await fs.readFile(outputPath, 'utf-8');

      // Clean up the output file
      await fs.unlink(outputPath);

      return transcription.trim();
    } catch (error) {
      console.error('Speech to text error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async transcribeStream(audioStream: NodeJS.ReadableStream): Promise<string> {
    // Create a temporary file for the audio stream
    const tempFile = path.join(process.cwd(), 'temp', `${Date.now()}.wav`);
    
    try {
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(tempFile), { recursive: true });

      // Write the stream to a temporary file
      const writeStream = createWriteStream(tempFile);
      await new Promise((resolve, reject) => {
        audioStream.pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      // Transcribe the temporary file
      const transcription = await this.transcribe(tempFile);

      // Clean up
      await fs.unlink(tempFile);

      return transcription;
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      throw error;
    }
  }
} 