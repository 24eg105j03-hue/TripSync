import mongoose from 'mongoose';
import Trip from '../models/Trip.js';


// Helper to calculate trip duration in days
const calculateDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private
export const createTrip = async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, currency, interests } = req.body;

    // Validation
    if (!destination || !destination.trim()) {
      return res.status(400).json({ message: 'Destination is required' });
    }
    if (!startDate) {
      return res.status(400).json({ message: 'Start date is required' });
    }
    if (!endDate) {
      return res.status(400).json({ message: 'End date is required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    if (budget === undefined || budget === null || Number(budget) <= 0) {
      return res.status(400).json({ message: 'Budget must be a positive number' });
    }

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ message: 'At least one interest is required' });
    }

    const duration = calculateDuration(startDate, endDate);
    const userId = req.user._id || req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.status(503).json({ message: 'Database unavailable. Please check the MongoDB connection.' });
    }

    const trip = await Trip.create({
      userId,
      destination: destination.trim(),
      startDate: start,
      endDate: end,
      duration,
      budget: Number(budget),
      currency: currency || 'INR',
      interests
    });

    return res.status(201).json(trip);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get all trips for logged in user
// @route   GET /api/trips
// @access  Private
export const getUserTrips = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.status(503).json({ message: 'Database unavailable. Please check the MongoDB connection.' });
    }

    const trips = await Trip.find({ userId }).sort({ createdAt: -1 });
    return res.json(trips);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get trip by ID
// @route   GET /api/trips/:id
// @access  Private
export const getTripById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.status(503).json({ message: 'Database unavailable. Please check the MongoDB connection.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this trip' });
    }

    return res.json(trip);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update trip
// @route   PUT /api/trips/:id
// @access  Private
export const updateTrip = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { destination, startDate, endDate, budget, currency, interests } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.status(503).json({ message: 'Database unavailable. Please check the MongoDB connection.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this trip' });
    }

    // Updates & Validations
    if (destination !== undefined) {
      if (!destination.trim()) return res.status(400).json({ message: 'Destination cannot be empty' });
      trip.destination = destination.trim();
    }

    let start = trip.startDate;
    let end = trip.endDate;

    if (startDate !== undefined) start = new Date(startDate);
    if (endDate !== undefined) end = new Date(endDate);

    if (isNaN(new Date(start).getTime()) || isNaN(new Date(end).getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date' });
    }

    if (new Date(end) < new Date(start)) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    trip.startDate = start;
    trip.endDate = end;
    trip.duration = calculateDuration(start, end);

    if (budget !== undefined) {
      if (Number(budget) <= 0) return res.status(400).json({ message: 'Budget must be a positive number' });
      trip.budget = Number(budget);
    }

    if (currency !== undefined) {
      trip.currency = currency;
    }

    if (interests !== undefined) {
      if (!Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({ message: 'At least one interest is required' });
      }
      trip.interests = interests;
    }

    const updatedTrip = await trip.save();
    return res.json(updatedTrip);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Delete trip
// @route   DELETE /api/trips/:id
// @access  Private
export const deleteTrip = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.status(503).json({ message: 'Database unavailable. Please check the MongoDB connection.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this trip' });
    }

    await trip.deleteOne();
    return res.json({ message: 'Trip removed successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
