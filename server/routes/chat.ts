import { Router } from 'express';
import { z } from 'zod';
import { MixtralModel } from '../lib/mixtral';

const router = Router();
const mixtralModel = new MixtralModel();

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })),
  model: z.string(),
  temperature: z.number().min(0).max(1),
  max_tokens: z.number().min(1)
});

router.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens } = chatRequestSchema.parse(req.body);

    // Format messages for Mixtral
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Use local Mixtral implementation
    const response = await mixtralModel.generateResponse(
      formattedMessages,
      temperature,
      max_tokens
    );

    res.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

export default router; 