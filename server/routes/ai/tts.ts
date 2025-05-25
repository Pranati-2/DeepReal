import { Router } from 'express';
import { TextToSpeechService } from '../../lib/ai/textToSpeech';

const router = Router();
const ttsService = new TextToSpeechService();

router.post('/', async (req, res) => {
  try {
    const { text, voiceProfileId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const audioBuffer = await ttsService.synthesizeSpeech(text, voiceProfileId);
    
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', 'attachment; filename=speech.wav');
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

router.get('/voices', async (req, res) => {
  try {
    const voiceProfiles = ttsService.listVoiceProfiles();
    res.json({ voiceProfiles });
  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({ error: 'Failed to get voice profiles' });
  }
});

export default router; 