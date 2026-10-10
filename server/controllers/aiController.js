import { GoogleGenAI } from '@google/genai';
import Trip from '../models/Trip.js';
import mongoose from 'mongoose';

// ─── Shared: Validate itinerary shape ───────────────────────────────────────
const validateItinerary = (data, expectedDays) => {
  if (!data || !Array.isArray(data.days)) {
    return 'AI response is missing a "days" array';
  }
  if (data.days.length !== expectedDays) {
    return `AI returned ${data.days.length} day(s) but the trip is ${expectedDays} day(s)`;
  }
  for (const day of data.days) {
    if (!day.date || !Array.isArray(day.activities)) {
      return `Day ${day.day} is missing required fields (date, activities)`;
    }
    const times = [];
    for (const act of day.activities) {
      if (!act.name || !act.startTime || !act.endTime) {
        return `Activity "${act.name || '?'}" on day ${day.day} is missing name, startTime, or endTime`;
      }
      if (typeof act.estimatedCost !== 'number') {
        return `Activity "${act.name}" is missing a numeric estimatedCost`;
      }
      // Check time format HH:MM
      const timeRe = /^\d{2}:\d{2}$/;
      if (!timeRe.test(act.startTime) || !timeRe.test(act.endTime)) {
        return `Activity "${act.name}" has invalid time format (expected HH:MM)`;
      }
      // Overlap check within the day
      const start = act.startTime.replace(':', '');
      const end = act.endTime.replace(':', '');
      if (end <= start) {
        return `Activity "${act.name}" has endTime before or equal to startTime`;
      }
      for (const [s, e] of times) {
        if (start < e && end > s) {
          return `Activity "${act.name}" overlaps with another activity on day ${day.day}`;
        }
      }
      times.push([start, end]);
    }
  }
  if (typeof data.totalEstimatedCost !== 'number') {
    return 'AI response is missing a numeric totalEstimatedCost';
  }
  return null; // null = valid
};

// ─── Shared: Call Gemini with exponential backoff ────────────────────────────
const callGeminiWithRetry = async (ai, prompt) => {
  const maxAttempts = 3;
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return { text: response.text, error: null };
    } catch (err) {
      const status = err.status;
      if (status && [429, 500, 502, 503, 504].includes(status)) {
        attempt++;
        if (attempt < maxAttempts) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.log(`Gemini ${status} – retrying attempt ${attempt + 1}/${maxAttempts} in ${delayMs}ms…`);
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
      }
      return { text: null, error: err };
    }
  }
  return { text: null, error: new Error('Gemini did not respond after maximum retries') };
};

// @desc    Generate an AI itinerary for a trip
// @route   POST /api/ai/generate-itinerary
// @access  Private
export const generateItinerary = async (req, res) => {
  try {
    const { tripId } = req.body;
    
    if (!tripId) {
      return res.status(400).json({ message: 'Trip ID is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server. Please check the backend configuration.' });
    }

    const userId = req.user._id || req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.status(503).json({ message: 'Database unavailable. Please check the MongoDB connection.' });
    }

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: 'Invalid Trip ID format' });
    }
    const trip = await Trip.findById(tripId);

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to generate itinerary for this trip' });
    }

    // Initialize Gemini API
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      You are an expert travel planner. Create a realistic day-by-day travel itinerary based on the following details:
      Destination: ${trip.destination}
      Start Date: ${trip.startDate.toISOString().split('T')[0]}
      End Date: ${trip.endDate.toISOString().split('T')[0]}
      Duration: ${trip.duration} days
      Total Budget: ${trip.budget} ${trip.currency}
      Interests: ${trip.interests.join(', ')}

      Requirements:
      - The itinerary must contain exactly ${trip.duration} days.
      - Use the correct dates starting from ${trip.startDate.toISOString().split('T')[0]}.
      - Prioritize the user's interests.
      - Distribute activities realistically, avoiding overlapping times or packed days.
      - Use reasonable activity durations.
      - Include estimated costs for activities.
      - Keep the estimated total cost within the user's budget where reasonably possible.
      - Sequence activities logically based on location and time.
      - Include reasonable free time.
      - Produce practical travel activities rather than generic filler.

      Return ONLY valid JSON with this exact structure, with no markdown formatting around it (do not use \`\`\`json):
      {
        "days": [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "activities": [
              {
                "name": "Activity name",
                "category": "Food",
                "location": "Location",
                "startTime": "10:00",
                "endTime": "12:00",
                "estimatedCost": 500,
                "description": "Short description"
              }
            ]
          }
        ],
        "totalEstimatedCost": 5000
      }
    `;

    const { text: rawText, error: geminiError } = await callGeminiWithRetry(ai, prompt);

    if (geminiError) {
      const status = geminiError.status;
      console.error('Gemini API generation failed:', geminiError);
      return res.status(status || 500).json({
        message: `Failed to generate itinerary. AI service error: ${geminiError.message}`
      });
    }

    if (!rawText) {
      return res.status(500).json({ message: 'AI returned an empty response after retries' });
    }

    // Safely parse JSON response
    let itineraryData;
    try {
      itineraryData = JSON.parse(rawText);
    } catch {
      console.error('Failed to parse Gemini response for generation:', rawText);
      return res.status(500).json({ message: 'AI returned an invalid JSON response' });
    }

    // Validate structure, times, overlaps and costs
    const validationError = validateItinerary(itineraryData, trip.duration);
    if (validationError) {
      console.error('Itinerary validation failed:', validationError);
      return res.status(500).json({ message: `AI returned an invalid itinerary: ${validationError}` });
    }

    // Save itinerary to trip
    trip.itinerary = itineraryData;
    await trip.save();

    return res.status(200).json({ message: 'Itinerary generated successfully', itinerary: itineraryData });

  } catch (error) {
    console.error('Error generating itinerary:', error);
    return res.status(500).json({ message: 'Failed to generate itinerary: ' + error.message });
  }
};

// @desc    Update an existing itinerary with a natural-language instruction
// @route   POST /api/ai/update-itinerary
// @access  Private
export const updateItinerary = async (req, res) => {
  try {
    const { tripId, instruction } = req.body;

    if (!tripId) {
      return res.status(400).json({ message: 'Trip ID is required' });
    }
    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ message: 'Instruction cannot be empty' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const userId = req.user._id || req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return res.status(503).json({ message: 'Database unavailable. Please check the MongoDB connection.' });
    }
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: 'Invalid Trip ID format' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (trip.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this itinerary' });
    }
    if (!trip.itinerary) {
      return res.status(400).json({ message: 'No itinerary exists for this trip. Generate one first.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      You are an expert travel planner revising an existing itinerary based on a user instruction.

      Trip Details (DO NOT CHANGE THESE):
      - Destination: ${trip.destination}
      - Start Date: ${trip.startDate.toISOString().split('T')[0]}
      - End Date: ${trip.endDate.toISOString().split('T')[0]}
      - Duration: ${trip.duration} days
      - Total Budget: ${trip.budget} ${trip.currency}
      - Interests: ${trip.interests.join(', ')}

      Existing Itinerary:
      ${JSON.stringify(trip.itinerary, null, 2)}

      User's Instruction:
      "${instruction.trim()}"

      Rules:
      - Apply ONLY the changes requested by the user.
      - Preserve all days, dates, destination, duration, and budget constraints.
      - The revised itinerary must contain exactly ${trip.duration} days.
      - Keep the original dates for each day unchanged.
      - Avoid overlapping activity times within any single day.
      - Each activity must have a startTime and endTime in HH:MM format (24-hour).
      - Each activity must have a numeric estimatedCost.
      - The totalEstimatedCost must be a number.
      - Do NOT add travelStyle or preferredPace fields.
      - Return ONLY valid JSON with no markdown or explanation:
      {
        "days": [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "activities": [
              {
                "name": "Activity name",
                "category": "Food",
                "location": "Location",
                "startTime": "10:00",
                "endTime": "12:00",
                "estimatedCost": 500,
                "description": "Short description"
              }
            ]
          }
        ],
        "totalEstimatedCost": 5000
      }
    `;

    const { text: rawText, error: geminiError } = await callGeminiWithRetry(ai, prompt);

    if (geminiError) {
      const status = geminiError.status;
      console.error('Gemini update failed:', geminiError);
      // Itinerary NOT overwritten on error
      return res.status(status || 500).json({
        message: `AI service error: ${geminiError.message}. Original itinerary preserved.`
      });
    }
    if (!rawText) {
      return res.status(500).json({ message: 'AI returned an empty response. Original itinerary preserved.' });
    }

    // Parse
    let revisedItinerary;
    try {
      revisedItinerary = JSON.parse(rawText);
    } catch {
      console.error('Failed to parse Gemini update response:', rawText);
      return res.status(500).json({ message: 'AI returned invalid JSON. Original itinerary preserved.' });
    }

    // Validate before saving
    const validationError = validateItinerary(revisedItinerary, trip.duration);
    if (validationError) {
      console.error('Revised itinerary failed validation:', validationError);
      return res.status(500).json({
        message: `AI returned an invalid revised itinerary: ${validationError}. Original itinerary preserved.`
      });
    }

    // Only overwrite after successful validation
    trip.itinerary = revisedItinerary;
    await trip.save();

    return res.status(200).json({
      message: 'Itinerary updated successfully',
      itinerary: revisedItinerary
    });

  } catch (error) {
    console.error('Error updating itinerary:', error);
    return res.status(500).json({ message: 'Failed to update itinerary: ' + error.message });
  }
};
