import express from 'express';
import { generateItinerary, updateItinerary } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/generate-itinerary', generateItinerary);
router.post('/update-itinerary', updateItinerary);

export default router;
