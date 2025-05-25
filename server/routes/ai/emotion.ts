import { Router } from 'express';
import { EmotionDetectionService } from '../../lib/ai/emotionDetection';

const router = Router();
const emotionDetectionService = new EmotionDetectionService();

router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const emotions = await emotionDetectionService.detectEmotionFromText(text);
    res.json({ emotions });
  } catch (error) {
    console.error('Emotion detection error:', error);
    res.status(500).json({ error: 'Failed to detect emotion' });
  }
});

export default router; 