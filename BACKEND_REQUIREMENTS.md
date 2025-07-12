# Backend Requirements for Travel API Providers

## Overview

The modular travel API system requires your backend to proxy all external API calls to avoid CORS issues. The frontend never calls external APIs directly.

## Required Backend Endpoints

### For Hotelbeds Provider

Your backend should implement these endpoints:

```
GET  /api/hotelbeds/test
POST /api/hotelbeds/search
GET  /api/hotelbeds/hotels/:hotelCode
POST /api/hotelbeds/availability
GET  /api/hotelbeds/status
```

### For Duffel Provider

Your backend should implement these endpoints:

```
GET  /api/duffel/test
POST /api/duffel/offer-requests
GET  /api/duffel/offers
POST /api/duffel/orders
GET  /api/duffel/offers/:offerId
```

## Test Endpoints (Optional but Recommended)

Test endpoints allow the frontend to verify connectivity without making actual API calls:

### Hotelbeds Test Endpoint
```
GET /api/hotelbeds/test
Response: { "status": "ok", "provider": "hotelbeds", "timestamp": "..." }
```

### Duffel Test Endpoint
```
GET /api/duffel/test
Response: { "status": "ok", "provider": "duffel", "timestamp": "..." }
```

## Fallback Behavior

If test endpoints are not implemented:
- **Hotelbeds**: Will try `/health` endpoint as fallback
- **Duffel**: Will assume configuration is valid if credentials are provided

## Architecture Flow

```
Frontend → Your Backend (localhost:3001) → External API (Hotelbeds/Duffel)
```

**NOT:**
```
Frontend → External API (BLOCKED by CORS)
```

## Configuration Notes

- **Backend URL**: Always point to your backend server (e.g., `http://localhost:3001`)
- **External API Keys**: Store these in your backend environment variables
- **CORS**: Your backend should handle CORS for frontend requests
- **Security**: Never expose external API keys in the frontend

## Current Status

✅ **Working**: Hotel/Flight search through existing endpoints
⚠️ **Missing**: Test endpoints (optional - for connection testing)
✅ **Configured**: Proper backend routing through localhost:3001 and /api/duffel