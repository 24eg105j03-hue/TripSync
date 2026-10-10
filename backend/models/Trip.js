import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  durationDays: {
    type: Number,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  interests: {
    type: [String]
  },
  travelStyle: {
    type: String,
    enum: ['Backpacker', 'Moderate', 'Luxury', 'Family', 'Solo', 'Adventure']
  },
  preferredPace: {
    type: String,
    enum: ['Relaxed', 'Moderate', 'Packed']
  },
  source: {
    type: String,
    enum: ['AI_GENERATED', 'UPLOADED'],
    default: 'AI_GENERATED'
  }
}, { timestamps: true });

const Trip = mongoose.model('Trip', tripSchema);
export default Trip;