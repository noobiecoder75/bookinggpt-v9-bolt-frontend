# Duffel API Setup Guide

## Overview
This guide will help you set up Duffel API integration for flight search and booking functionality. Duffel provides a modern, developer-friendly API for accessing flight inventory from multiple airlines.

## Prerequisites

1. **Duffel Account**: You need a Duffel API account to get the required credentials.
2. **API Access Token**: Bearer token from Duffel for authentication.

## Getting Duffel API Credentials

### Step 1: Create Duffel Developer Account
1. Go to [Duffel Developer Portal](https://duffel.com/developers)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Access Token
1. Log in to your Duffel dashboard
2. Navigate to the "API Keys" section
3. Create a new API key for your application
4. Copy the access token (starts with `duffel_test_` for test environment)

## Environment Variables Setup

Add the following environment variables to your `.env` file:

```env
# Duffel API Configuration
DUFFEL_ACCESS_TOKEN=your_duffel_access_token_here
```

**Important**: 
- Never commit these credentials to version control
- Keep your `.env` file in `.gitignore`
- Use test tokens for development (`duffel_test_`) and production tokens for live (`duffel_live_`)
- Only the server-side token (`DUFFEL_ACCESS_TOKEN`) is needed; frontend tokens are no longer required due to CORS proxy implementation

## API Environment

The current setup uses the **production environment** with test credentials:
- Base URL: `https://api.duffel.com`
- Test tokens provide sandbox data, not real bookings
- Perfect for development and testing

## How It Works

### CORS Proxy Solution
Due to CORS (Cross-Origin Resource Sharing) restrictions, Duffel API cannot be called directly from the browser. We've implemented a server-side proxy to handle this:

- **Frontend**: Makes requests to `/api/duffel/*` endpoints
- **Server Proxy**: Forwards requests to Duffel API with proper authentication
- **Authentication**: Server handles Bearer token authentication internally
- **Security**: API tokens are kept secure on the server side only

### Authentication
Duffel uses Bearer token authentication:
- Server includes `Authorization: Bearer your_token_here` in headers
- No need for OAuth flow - direct token usage
- Tokens are long-lived and don't expire frequently
- Frontend never sees the actual API token

### Flight Search Flow

1. **Create Offer Request**: Submit search criteria (origin, destination, dates, passengers)
2. **Fetch Offers**: Retrieve flight offers from the offer request
3. **Select Offer**: Choose a specific flight offer
4. **Create Order**: Book the selected offer with passenger details

### Search Integration

The flight search now uses Duffel's two-step process via server proxy:
1. **POST /api/duffel/offer-requests**: Create offer request with search criteria (proxied to Duffel)
2. **GET /api/duffel/offers**: Fetch available offers from the request (proxied to Duffel)

### Booking Integration

The booking process uses server-side API calls:
1. **Server-side POST /air/orders**: Create order with selected offer and passenger details
2. **Payment**: Currently configured for test environment with balance payment

## API Endpoints

### Frontend Endpoints (Proxy)
- **Test Connection**: `GET /api/duffel/test`
- **Create Offer Request**: `POST /api/duffel/offer-requests`
- **Get Offers**: `GET /api/duffel/offers?offer_request_id={id}`
- **Create Order**: `POST /api/duffel/orders`
- **Get Order**: `GET /api/duffel/orders/{id}`

### Direct Duffel API (Server-side only)
- **Create Offer Request**: `POST /air/offer_requests`
- **Get Offers**: `GET /air/offers?offer_request_id={id}`
- **Create Order**: `POST /air/orders`
- **Get Order**: `GET /air/orders/{id}`

## Data Structure Differences

### Duffel vs Amadeus Key Differences:

| Concept | Duffel | Amadeus |
|---------|---------|----------|
| Flight Journey | `slices` | `itineraries` |
| Flight Segment | `segments` | `segments` |
| Departure | `departing_at` | `departure.at` |
| Arrival | `arriving_at` | `arrival.at` |
| Airport Code | `origin.iata_code` | `departure.iataCode` |
| Price | `total_amount` | `price.total` |
| Currency | `total_currency` | `price.currency` |
| Airline | `marketing_carrier` | `carrierCode` |

## Test Environment

### Test Routes for Debugging
Duffel provides specific test routes that return predictable results:

- **LHR → LGW**: Order creation failure simulation
- **LTN → STN**: 200 Success response simulation  
- **SEN → STN**: 202 Accepted response simulation
- **BTS → ABV**: No additional services scenario

## Verification

After setting up the credentials:

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Check the browser console** for proxy logs:
   - You should see "Duffel offer request created successfully"
   - Look for "via server proxy" messages indicating the proxy is working

3. **Try searching for flights**:
   - Go to trip overview
   - Click "Add Flight" in the itinerary
   - Search should now work without CORS errors
   - Test the "Test API Connection" button for immediate verification

## Troubleshooting

### Common Issues

1. **"Failed to fetch" / CORS errors**
   - This is now resolved by the server proxy
   - If you still see these, ensure the server is running
   - Check that `/api/duffel/test` endpoint responds correctly

2. **"Duffel API token not configured"**
   - Check that your API token is correct in `.env`
   - Ensure there are no extra spaces in the .env file
   - Verify your Duffel account is active
   - Restart the server after updating environment variables

3. **"Failed to create offer request"**
   - Your API token might be invalid
   - Check if your Duffel account has proper permissions
   - Verify you're using the correct test/production token

4. **"No flights found"**
   - Check your search criteria (dates, airports)
   - Ensure airport codes are valid IATA codes
   - Try different routes or dates

### Debug Steps

1. **Test server proxy connection**:
   - Visit `/api/duffel/test` in your browser
   - Should return success message if configured correctly

2. **Check server logs**:
   - Look for "Duffel API connection successful" messages
   - Check for any authentication errors in server console

3. **Check browser console**:
   - Look for "via server proxy" messages
   - Check network tab for calls to `/api/duffel/*` endpoints

4. **Verify environment variables**:
   ```bash
   # In server console, you should see:
   DUFFEL_ACCESS_TOKEN: Found
   ```

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Keep your API tokens secure
- Use test tokens for development only
- Rotate tokens periodically for security

## Migration from Amadeus

If you're migrating from Amadeus:

1. **Environment Variables**: Replace `VITE_AMADEUS_*` with `VITE_DUFFEL_ACCESS_TOKEN`
2. **API Calls**: Two-step process (offer request → offers) vs single search
3. **Data Structure**: Update code to use `slices` instead of `itineraries`
4. **Authentication**: Bearer token vs OAuth 2.0
5. **Booking**: Simplified passenger data structure

## Support

- **Duffel Documentation**: https://duffel.com/docs
- **API Reference**: https://duffel.com/docs/api
- **Support**: Contact Duffel support through their dashboard 