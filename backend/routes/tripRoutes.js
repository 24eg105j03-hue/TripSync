import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createTrip, getTrips, getTripById, deleteTrip } from '../controllers/tripController.js';

const router = express.Router();

router.use(protect);

router.get('/', getTrips);
router.post('/', createTrip);
router.get('/:id', getTripById);
router.delete('/:id', deleteTrip);

export default router;