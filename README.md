# bookinggpt-v9-bolt-frontend

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/noobiecoder75/bookinggpt-v9-bolt-frontend)

## Configuration

### Environment Variables

For production deployment, you need to set the following environment variables:

**Required:**
- `API_URL` - Your backend API URL (for Netlify redirects)
- `VITE_API_URL` - Your backend API URL (for frontend API calls)

**Optional:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

### Development Setup

1. Copy `.env.example` to `.env.local`
2. Fill in the required environment variables
3. Run `npm install`
4. Run `npm run dev`

### Production Deployment

1. Deploy your backend API to a hosting service (Heroku, Railway, Render, etc.)
2. Set the `API_URL` environment variable in your Netlify deployment settings
3. Set the `VITE_API_URL` environment variable to the same backend URL
4. Deploy the frontend to Netlify

**Example Netlify Environment Variables:**
```
API_URL=https://your-backend-api.herokuapp.com
VITE_API_URL=https://your-backend-api.herokuapp.com
```

## API Routing

The application uses a hybrid approach for API routing:

- In development: API calls go to `http://localhost:3001`
- In production: API calls are redirected to your deployed backend URL using Netlify redirects

If you see HTML responses instead of JSON from API calls, it means:
1. The backend API is not deployed or not running
2. The `API_URL` environment variable is not set correctly
3. The backend URL is incorrect