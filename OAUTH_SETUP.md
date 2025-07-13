# OAuth Setup Requirements

## Critical Configuration Change Required

### Google Cloud Console Redirect URI Update

**⚠️ MANDATORY ACTION REQUIRED** ⚠️

To complete the Gmail OAuth integration fix, you **MUST** update the authorized redirect URI in your Google Cloud Console project.

#### Steps to Update Google Cloud Console:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (the one with your OAuth 2.0 client)

2. **Navigate to OAuth 2.0 Client IDs**
   - Go to: APIs & Services → Credentials
   - Find your OAuth 2.0 Client ID (used in `VITE_GOOGLE_CLIENT_ID`)
   - Click on the client ID to edit

3. **Update Authorized Redirect URIs**
   - **REMOVE (if present)**: `https://yourdomain.com/oauth/gmail/callback.html`
   - **ADD**: `https://yourdomain.com/oauth/gmail/callback`
   
   For development:
   - **REMOVE (if present)**: `http://localhost:5173/oauth/gmail/callback.html`
   - **ADD**: `http://localhost:5173/oauth/gmail/callback`

4. **Save Changes**
   - Click "Save" at the bottom of the page
   - Changes may take a few minutes to propagate

#### Before/After Example:

**BEFORE (Old Static HTML):**
```
https://yourdomain.com/oauth/gmail/callback.html
http://localhost:5173/oauth/gmail/callback.html
```

**AFTER (New React Route):**
```
https://yourdomain.com/oauth/gmail/callback
http://localhost:5173/oauth/gmail/callback
```

### Environment Variables

Ensure these environment variables are configured:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### What Happens If You Don't Update?

If you don't update the redirect URI in Google Cloud Console:
- OAuth flow will fail with "redirect_uri_mismatch" error
- Users will see an error message from Google
- Gmail integration will not work

### Re-authorization Required After Scope Update

**⚠️ IMPORTANT**: If you were previously connected to Gmail and encounter a 403 Forbidden error when testing the connection:

1. **Disconnect Gmail**: Go to Settings → Gmail Integration → Click "Disconnect"
2. **Reconnect Gmail**: Click "Connect Gmail" to authorize with the new scopes
3. **Why this is needed**: OAuth tokens are tied to specific scopes. Adding `gmail.readonly` scope requires re-authorization.

The new scopes include:
- `gmail.send` - Send emails on your behalf
- `gmail.readonly` - Read Gmail profile information (fixes 403 error)
- `userinfo.email` - Access your email address  
- `userinfo.profile` - Access your basic profile information

### Testing the Fix

1. **Development Testing:**
   - Navigate to Settings → Gmail Integration
   - Click "Connect Gmail"
   - Complete OAuth flow
   - Should redirect to React callback page instead of static HTML
   - Should show success/error states with navigation options

2. **Production Testing:**
   - Same steps as development
   - Ensure production domain is in authorized redirect URIs

### Benefits of the New React Callback

✅ **Fixed Navigation**: Users can always return to settings
✅ **Better UX**: Clear success/error messages with proper actions
✅ **No Browser Errors**: No more `window.close()` security restrictions
✅ **Consistent UI**: Matches app design and styling
✅ **Better Error Handling**: Specific error messages and recovery options
✅ **Auto-redirect**: Automatic return to settings with countdown timer
✅ **Manual Fallback**: Manual navigation buttons if auto-redirect fails

### Troubleshooting

#### Common Issues:

1. **"redirect_uri_mismatch" error**
   - Solution: Update Google Cloud Console redirect URIs (see steps above)

2. **OAuth callback shows 404**
   - Solution: Ensure the route is added to App.tsx (already done)

3. **"Client not authorized" error**
   - Solution: Check that client ID/secret environment variables are correct

4. **Popup blocked**
   - Solution: The system automatically falls back to redirect method

#### Support:

If you encounter issues:
1. Check browser console for detailed error messages
2. Verify environment variables are set correctly
3. Confirm Google Cloud Console redirect URIs are updated
4. Ensure the application is running on the same domain as configured in Google Cloud Console

---

**Last Updated**: $(date)
**Status**: Ready for production use
**Required Action**: Update Google Cloud Console redirect URIs