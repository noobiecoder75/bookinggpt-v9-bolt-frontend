# Hotelbeds API Setup Guide

This guide will help you set up Hotelbeds API integration for hotel search functionality.

## Prerequisites

1. **Hotelbeds Account**: You need a Hotelbeds API account to get the required credentials.
2. **API Credentials**: API Key and Secret from Hotelbeds.

## Getting Hotelbeds API Credentials

1. **Sign up**: Visit [Hotelbeds Developer Portal](https://developer.hotelbeds.com)
2. **Create Account**: Register for a developer account
3. **Get Credentials**: Once approved, you'll receive:
   - API Key
   - Secret Key
4. **Test Environment**: Initially, you'll get test environment credentials

## Environment Variables Setup

Add the following environment variables to your `.env` file:

```env
# Hotelbeds API Configuration
HOTELBEDS_API_KEY=your_api_key_here
HOTELBEDS_SECRET=your_secret_key_here
```

**Important**: 
- Never commit these credentials to version control
- Keep your `.env` file in `.gitignore`
- For production, use production environment URLs and credentials

## API Environment

The current setup uses the **test environment**:
- Test Base URL: `https://api.test.hotelbeds.com`

For production, change to:
- Production Base URL: `https://api.hotelbeds.com`

## How It Works

### Authentication
Hotelbeds uses a signature-based authentication:
1. Generate timestamp
2. Create signature: SHA256(API_KEY + SECRET + timestamp)
3. Include API key and signature in headers

### Hotel Search Integration

The hotel search modal now combines:
1. **Local Inventory**: Hotels from your uploaded rates (Supabase)
2. **Live API Results**: Real-time results from Hotelbeds API

### Search Flow
1. User opens hotel search modal
2. System searches both sources simultaneously:
   - Local rates table (Supabase)
   - Hotelbeds API (if destination/country provided)
3. Results are combined and displayed with source badges
4. User can select any hotel from either source

## API Endpoints

### Search Hotels
- **Endpoint**: `POST /api/hotelbeds/search`
- **Purpose**: Search for hotels using Hotelbeds API
- **Parameters**:
  ```json
  {
    "destination": "destination_code_or_name",
    "checkInDate": "YYYY-MM-DD",
    "checkOutDate": "YYYY-MM-DD",
    "guests": 2,
    "hotelName": "optional_hotel_name"
  }
  ```

### Get Destinations
- **Endpoint**: `GET /api/hotelbeds/destinations?query=destination_name`
- **Purpose**: Get destination codes for search
- **Usage**: Helper endpoint to find proper destination codes

## Destination Codes

Hotelbeds requires specific destination codes. You can:
1. Use the `/destinations` endpoint to find codes
2. Or use common destination names (the API will try to match)

## Error Handling

The integration is designed to be resilient:
- If Hotelbeds API is unavailable, local results still show
- Network errors don't break the search functionality
- Clear error messages for debugging

## Testing

1. **Start Backend Server**:
   ```bash
   cd server
   npm start
   ```

2. **Test API Route First**:
   Visit: `http://localhost:3001/api/hotelbeds/test`
   
   Should show:
   ```json
   {
     "message": "Hotelbeds API route is working!",
     "env": {
       "hasApiKey": true,
       "hasSecret": true,
       "baseUrl": "https://api.test.hotelbeds.com"
     }
   }
   ```

3. **Test Search**:
   - Open hotel search modal
   - Enter search criteria with a **known destination** (e.g., "Madrid", "Paris", "London")
   - Should see results from both local inventory and Hotelbeds

4. **Check Console Logs**:
   - **Server Console**: Look for detailed API request/response logs
   - **Browser Console**: Check for any frontend errors
   - Verify authentication signature generation
   - Check destination code mapping

## Important Notes

- **Destination Codes**: Hotelbeds requires specific 3-letter destination codes (MAD for Madrid, PAR for Paris, etc.)
- **Test Environment**: Limited to 50 requests per day
- **Authentication**: Uses API Key + SHA256 signature of (API_KEY + SECRET + TIMESTAMP)

## Troubleshooting

### Common Issues

1. **Authentication Failed**:
   - Verify API key and secret are correct
   - Check timestamp generation
   - Ensure signature is properly generated

2. **No API Results**:
   - Check internet connection
   - Verify destination code/name
   - Check Hotelbeds API status

3. **CORS Issues**:
   - API calls go through backend server
   - Ensure server is running on port 3001

### Debug Steps

1. **Check Environment Variables**:
   ```bash
   # Server should log these on startup
   HOTELBEDS_API_KEY: Found/Missing
   HOTELBEDS_SECRET: Found/Missing
   ```

2. **Monitor Network Tab**:
   - Check API calls to `/api/hotelbeds/search`
   - Look for error responses

3. **Server Logs**:
   - Watch server console for Hotelbeds API requests
   - Check for authentication and response logs

## Data Mapping

Hotelbeds hotel data is mapped to your application format:

```javascript
// Hotelbeds Response -> Your Format
{
  id: `hotelbeds-${hotel.code}`,
  rate_type: 'Hotel',
  description: hotel.name,
  cost: hotel.minRate,
  currency: hotel.currency,
  details: {
    source: 'hotelbeds',
    imported_from: 'Hotelbeds API',
    chain: hotel.chainCode,
    category: hotel.categoryCode,
    // ... additional hotel details
  }
}
```

## Next Steps

1. **Get Credentials**: Sign up for Hotelbeds developer account
2. **Add Environment Variables**: Update your `.env` file
3. **Restart Server**: Restart backend to load new env vars
4. **Test Integration**: Try hotel searches with destinations
5. **Monitor Results**: Check that both local and API results appear

For support, check the [Hotelbeds API Documentation](https://developer.hotelbeds.com/documentation) or contact their support team. 