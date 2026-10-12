import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error('MongoDB connection error: Neither MONGO_URI nor MONGODB_URI is defined.');
      return false;
    }

    if (mongoUri.includes('your_username') || mongoUri.includes('<username>')) {
      console.warn('MongoDB connection warning: Placeholder credentials detected in connection URI.');
      return false;
    }

    const sanitizedUri = mongoUri.replace(/\/\/[^@]+@/, '//***:***@');
    console.log(`Connecting to MongoDB at: ${sanitizedUri}`);

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error(`MongoDB Connection Error [${error.name}]: ${error.message}`);
    if (error.reason) {
      console.error(`MongoDB Topology Reason: ${error.reason.type || 'Unknown'}`);
    }
    return false;
  }
};