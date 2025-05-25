import express from 'express';
import transcribeRouter from './transcribe';
import emotionRouter from './emotion';
import llmRouter from './llm';
import ttsRouter from './tts';
import { animationRouter } from './animation';

const router = express.Router();

// AI service routes
router.use('/transcribe', transcribeRouter);
router.use('/emotion', emotionRouter);
router.use('/llm', llmRouter);
router.use('/tts', ttsRouter);
router.use('/animation', animationRouter);

export default router; 