import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { generateItinerary, uploadItinerary, editItinerary, analyzeItinerary } from '../controllers/aiController.js';

const router = express.Router();

router.use(protect);

router.post('/generate', generateItinerary);
router.post('/upload', uploadItinerary);
router.post('/edit/:tripId', editItinerary);
router.post('/analyze/:tripId', analyzeItinerary);

export default router;