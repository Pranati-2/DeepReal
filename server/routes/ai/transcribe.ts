import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { SpeechToTextService } from '../../lib/ai/speechToText';

const router = Router();
const upload = multer({ dest: 'uploads/' });
const speechToTextService = new SpeechToTextService();

// Ensure uploads directory exists
(async () => {
  try {
    await fs.mkdir('uploads', { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
})();

// Define the request type with multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

router.post('/', upload.single('audio'), async (req: MulterRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const transcription = await speechToTextService.transcribe(req.file.path);
    
    // Clean up the uploaded file
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      console.error('Failed to delete uploaded file:', error);
    }

    res.json({ transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

export default router; 