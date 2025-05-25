import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { DeepfakeAnimationService } from '../../services/ai/deepfakeAnimation';

const router = Router();
const animationService = new DeepfakeAnimationService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../../temp'));
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage });

// POST /api/ai/animation/generate
router.post('/generate', upload.fields([
  { name: 'sourceImage', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    if (!files || !files.sourceImage?.[0] || !files.audio?.[0]) {
      return res.status(400).json({ error: 'Missing required files' });
    }

    const sourceImagePath = files.sourceImage[0].path;
    const audioPath = files.audio[0].path;

    const config = {
      fps: Number(req.body.fps) || 30,
      faceDetectorConfidence: Number(req.body.faceDetectorConfidence) || 0.7,
      enhanceQuality: req.body.enhanceQuality === 'true'
    };

    const videoUrl = await animationService.generateAnimation(
      sourceImagePath,
      audioPath,
      config
    );

    // Clean up uploaded files
    await Promise.all([
      fs.unlink(sourceImagePath),
      fs.unlink(audioPath)
    ]);

    res.json({ videoUrl });
  } catch (error) {
    console.error('Error in animation generation:', error);
    res.status(500).json({ error: 'Failed to generate animation' });
  }
});

export const animationRouter = router; 