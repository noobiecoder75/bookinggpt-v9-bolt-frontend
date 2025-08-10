import express from 'express';
import OpenAI from 'openai';
import { authenticateUser } from '../lib/supabase.js';

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to calculate budget allocations
function calculateBudgets(formData) {
  const totalNights = formData.destinations.reduce((sum, dest) => sum + dest.nights, 0);
  const budgetPerNight = formData.budget.total / totalNights;
  
  // Allocate budget by category
  const allocations = {
    hotelPerNight: budgetPerNight * 0.4,  // 40% for accommodation
    activitiesPerDay: budgetPerNight * 0.3, // 30% for activities  
    mealsPerDay: budgetPerNight * 0.3      // 30% for meals
  };
  
  // Calculate per-city budgets
  const cityBudgets = formData.destinations.map(dest => ({
    city: dest.city,
    nights: dest.nights,
    hotelBudgetPerNight: allocations.hotelPerNight,
    activityBudgetPerDay: allocations.activitiesPerDay,
    mealBudgetPerDay: allocations.mealsPerDay,
    totalCityBudget: budgetPerNight * dest.nights
  }));
  
  return {
    totalNights,
    budgetPerNight,
    allocations,
    cityBudgets
  };
}

// Helper function to build GPT prompt
function buildItineraryPrompt(formData, budgetAnalysis) {
  const { cityBudgets, totalNights } = budgetAnalysis;
  
  // Calculate dates for each city
  let currentDate = new Date(formData.tripDates.checkIn);
  const cityDates = formData.destinations.map(dest => {
    const startDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + dest.nights);
    const endDate = new Date(currentDate);
    
    return {
      city: dest.city,
      checkIn: startDate.toISOString().split('T')[0],
      checkOut: endDate.toISOString().split('T')[0],
      nights: dest.nights
    };
  });
  
  const prompt = `You are a professional travel planner. Generate a detailed ${totalNights}-day itinerary based on the following requirements.

TRIP OVERVIEW:
- Check-in: ${formData.tripDates.checkIn}
- Check-out: ${formData.tripDates.checkOut}
- Total Budget: $${formData.budget.total} USD
- Travelers: ${formData.occupancy.adults} adults${formData.occupancy.children > 0 ? `, ${formData.occupancy.children} children` : ''}

DESTINATIONS & BUDGET:
${cityBudgets.map((c, i) => `
${i + 1}. ${c.city} (${c.nights} nights)
   - Dates: ${cityDates[i].checkIn} to ${cityDates[i].checkOut}
   - Hotel Budget: $${c.hotelBudgetPerNight.toFixed(0)}/night
   - Activities Budget: $${c.activityBudgetPerDay.toFixed(0)}/day
   - Meals Budget: $${c.mealBudgetPerDay.toFixed(0)}/day
`).join('')}

PREFERENCES:
- Hotel Stars: ${formData.hotelPreferences.minStars} to ${formData.hotelPreferences.maxStars} stars
- Travel Pace: ${formData.travelPace}
- Activity Types: ${formData.activityPreferences.join(', ')}
- Special Requests: ${formData.specialRequests || 'None'}

INSTRUCTIONS:
1. Create a day-by-day itinerary with specific times
2. Include hotel check-ins/check-outs on appropriate days
3. Stay within the budget constraints for each category
4. Add realistic travel/transfer times between cities
5. Include buffer time between activities
6. Match the travel pace preference (${formData.travelPace})
7. Focus on the preferred activity types

Return ONLY valid JSON in this exact format:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "city": "City Name",
      "dayNumber": 1,
      "dayTitle": "Brief description of the day",
      "items": [
        {
          "time": "HH:MM",
          "type": "hotel|activity|meal|transfer",
          "name": "Name of place/activity",
          "description": "Brief description",
          "duration": "X hours",
          "cost": number,
          "notes": "Any helpful tips or info"
        }
      ]
    }
  ],
  "summary": {
    "totalEstimatedCost": number,
    "hotelsNeeded": ["List of hotel recommendations within budget"],
    "keyHighlights": ["Main attractions and experiences"]
  }
}

IMPORTANT: Ensure all costs are in USD and within the specified budgets. The response must be valid JSON only, no additional text.`;

  return prompt;
}

// Generate itinerary endpoint
router.post('/generate', authenticateUser, async (req, res) => {
  try {
    console.log('=== Trip Builder Generate Request ===');
    console.log('User:', req.user.id);
    console.log('Form data:', JSON.stringify(req.body, null, 2));
    
    const { formData } = req.body;
    
    // Validate required fields
    if (!formData.tripDates?.checkIn || !formData.tripDates?.checkOut) {
      return res.status(400).json({ 
        error: 'Trip dates are required' 
      });
    }
    
    if (!formData.destinations || formData.destinations.length === 0) {
      return res.status(400).json({ 
        error: 'At least one destination is required' 
      });
    }
    
    if (!formData.budget?.total || formData.budget.total <= 0) {
      return res.status(400).json({ 
        error: 'Valid budget is required' 
      });
    }
    
    // Calculate budget allocations
    const budgetAnalysis = calculateBudgets(formData);
    console.log('Budget analysis:', budgetAnalysis);
    
    // Build GPT prompt
    const prompt = buildItineraryPrompt(formData, budgetAnalysis);
    console.log('GPT Prompt length:', prompt.length);
    
    // Call OpenAI
    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional travel planner. You always respond with valid JSON only, no additional text or markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });
    
    const response = completion.choices[0].message.content;
    console.log('OpenAI response received, length:', response.length);
    
    // Parse the response
    let itinerary;
    try {
      itinerary = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse GPT response:', parseError);
      console.log('Raw response:', response.substring(0, 500));
      return res.status(500).json({ 
        error: 'Failed to parse itinerary response',
        details: parseError.message 
      });
    }
    
    // Validate the response structure
    if (!itinerary.days || !Array.isArray(itinerary.days)) {
      console.error('Invalid itinerary structure:', itinerary);
      return res.status(500).json({ 
        error: 'Invalid itinerary format received' 
      });
    }
    
    console.log(`Generated itinerary with ${itinerary.days.length} days`);
    
    // Add metadata to response
    const enrichedResponse = {
      ...itinerary,
      metadata: {
        generatedAt: new Date().toISOString(),
        budgetAnalysis: budgetAnalysis,
        formData: formData
      }
    };
    
    res.json(enrichedResponse);
    
  } catch (error) {
    console.error('Trip builder generation error:', error);
    
    // Handle specific OpenAI errors
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        error: 'OpenAI API authentication failed. Please check API key.' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a moment.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate itinerary',
      details: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'trip-builder',
    timestamp: new Date().toISOString()
  });
});

export default router;