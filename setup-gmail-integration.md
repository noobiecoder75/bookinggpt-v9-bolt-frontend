# Gmail Integration Setup Guide

## 1. Database Migration

Since Supabase CLI isn't available, you'll need to run the migration manually:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/001_create_user_integrations.sql`
5. Click **Run** to execute the migration

## 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to **APIs & Services** > **Library**
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth 2.0 Client IDs**
   - Select **Web application**
   - Add authorized redirect URI: `http://localhost:5173/oauth/gmail/callback` (for development)
   - For production, add: `https://yourdomain.com/oauth/gmail/callback`
5. Copy the Client ID and Client Secret

## 3. Environment Variables

Update your `.env` file with the Google credentials:

```env
VITE_GOOGLE_CLIENT_ID=your-actual-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
```

## 4. Deploy Supabase Function (Optional)

If you want to use server-side email sending:

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref your-project-ref`
4. Deploy function: `supabase functions deploy gmail-send`
5. Set environment variables in Supabase dashboard:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## 5. OAuth Callback Page

Create an OAuth callback handler at `/oauth/gmail/callback`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Gmail OAuth Callback</title>
</head>
<body>
    <script>
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
            window.opener.postMessage({
                type: 'GMAIL_OAUTH_ERROR',
                error: error
            }, window.location.origin);
        } else if (code) {
            window.opener.postMessage({
                type: 'GMAIL_OAUTH_SUCCESS',
                code: code
            }, window.location.origin);
        }
        
        window.close();
    </script>
</body>
</html>
```

## 6. Test the Integration

1. Start your development server: `npm run dev`
2. Go to Settings > Integrations
3. Click "Connect Gmail" on the Gmail integration card
4. Complete the OAuth flow
5. Test sending an email using the "Test Connection" button

## Security Notes

- Never commit your actual Google credentials to version control
- Use environment variables for all sensitive data
- The OAuth tokens are stored encrypted in Supabase
- Always use HTTPS in production
- Consider implementing token rotation for enhanced security

## Troubleshooting

- **OAuth popup blocked**: Allow popups for your domain
- **Invalid redirect URI**: Ensure the callback URL matches exactly in Google Console
- **Token expired**: The system automatically refreshes tokens
- **Permission denied**: Check that Gmail API is enabled and scopes are correct