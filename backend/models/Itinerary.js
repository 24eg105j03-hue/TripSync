import mongoose from 'mongoose';

const itinerarySchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    unique: true,
    index: true
  },
  days: [{
    dayNumber: { type: Number, required: true },
    date: { type: String, required: true },
    activities: [{
      title: { type: String, required: true },
      description: String,
      category: {
        type: String,
        enum: ['Food', 'Sightseeing', 'Relaxation', 'Transit', 'Nightlife', 'Shopping', 'Adventure']
      },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      estimatedCost: { type: Number, default: 0 },
      location: String,
      notes: String
    }]
  }],
  validation: {
    lastRunAt: Date,
    isValid: { type: Boolean, default: true },
    issues: [{
      type: { type: String },
      severity: String,
      dayNumber: Number,
      message: String,
      details: mongoose.Schema.Types.Mixed
    }],
    totalEstimatedCost: { type: Number, default: 0 }
  },
  version: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

const Itinerary = mongoose.model('Itinerary', itinerarySchema);
export default Itinerary;