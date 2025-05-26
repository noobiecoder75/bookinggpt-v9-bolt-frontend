# Amadeus API Setup Guide

## Issue
The flight search is failing because the Amadeus access token is missing. The application requires Amadeus API credentials to search for flights.

## Required Environment Variables

You need to create a `.env` file in your project root with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://nlhcgalwrxopexwriumx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Supabase Service Role Key (for API routes)
NEXT_PUBLIC_SUPABASE_URL=https://nlhcgalwrxopexwriumx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Amadeus API Configuration (TEST ENVIRONMENT)
VITE_AMADEUS_CLIENT_ID=your_amadeus_client_id_here
VITE_AMADEUS_CLIENT_SECRET=your_amadeus_client_secret_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
```

## Getting Amadeus API Credentials

### Step 1: Create Amadeus Developer Account
1. Go to [Amadeus for Developers](https://developers.amadeus.com/)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create a New Application
1. Log in to your Amadeus Developer Portal
2. Go to "My Apps" section
3. Click "Create New App"
4. Fill in the application details:
   - **App Name**: BookingGPT Flight Search
   - **App Type**: Choose "Self-Service"
   - **Description**: Flight search integration for travel booking application

### Step 3: Get API Credentials
1. After creating the app, you'll see your credentials:
   - **API Key** (this is your `VITE_AMADEUS_CLIENT_ID`)
   - **API Secret** (this is your `VITE_AMADEUS_CLIENT_SECRET`)
2. Copy these values

### Step 4: Configure Environment Variables
1. Create a `.env` file in your project root directory
2. Add the Amadeus credentials:
   ```env
   VITE_AMADEUS_CLIENT_ID=your_actual_api_key_here
   VITE_AMADEUS_CLIENT_SECRET=your_actual_api_secret_here
   ```

## Test Environment vs Production

The application is currently configured to use Amadeus **TEST environment**:
- Hostname: `test.api.amadeus.com`
- This provides test data, not real flight bookings
- Perfect for development and testing

For production, you would need to:
1. Apply for production access through Amadeus
2. Change the hostname to `api.amadeus.com`
3. Use production credentials

## Verification

After setting up the credentials:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Check the browser console for authentication logs:
   - You should see "Amadeus authentication event: success"
   - No "Failed to obtain access token" errors

3. Try searching for flights:
   - Go to trip overview
   - Click "Add Flight" in the itinerary
   - Search should now work without authentication errors

## Troubleshooting

### Common Issues

1. **"Failed to obtain access token"**
   - Check that your API Key and Secret are correct
   - Ensure there are no extra spaces in the .env file
   - Verify your Amadeus account is active

2. **"Environment variables check: hasClientId: false"**
   - The .env file is not being loaded
   - Make sure the file is named exactly `.env` (not `.env.txt`)
   - Restart your development server

3. **"Authentication failed (401)"**
   - Your API credentials are invalid
   - Check if your Amadeus app is active
   - Verify you're using the correct API Key and Secret

### Debug Steps

1. Check environment variables are loaded:
   ```javascript
   console.log('Amadeus Client ID:', import.meta.env.VITE_AMADEUS_CLIENT_ID);
   console.log('Amadeus Client Secret:', import.meta.env.VITE_AMADEUS_CLIENT_SECRET);
   ```

2. Look for authentication logs in browser console
3. Check network tab for failed API requests

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Keep your API credentials secure
- Use test credentials for development only 