import { Router } from 'express';
import { LLMService } from '../../lib/ai/llmService';

const router = Router();
const llmService = new LLMService();

router.post('/', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    const response = await llmService.generateResponse(prompt);
    res.json(response);
  } catch (error) {
    console.error('LLM error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

router.post('/clear', async (req, res) => {
  try {
    llmService.clearContext();
    res.json({ success: true });
  } catch (error) {
    console.error('Clear context error:', error);
    res.status(500).json({ error: 'Failed to clear context' });
  }
});

export default router; 