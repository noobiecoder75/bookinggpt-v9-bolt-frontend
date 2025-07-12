import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  customerId?: number;
  quoteId?: string;
  emailType?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get user from auth token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Parse request body
    const emailData: EmailRequest = await req.json()

    // Get user's Gmail integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_type', 'gmail')
      .eq('is_connected', true)
      .single()

    if (integrationError || !integration) {
      throw new Error('Gmail integration not found or not connected')
    }

    // Check if access token is expired
    const now = Date.now() / 1000
    if (integration.tokens.expires_at < now) {
      // Try to refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: integration.tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Gmail access token')
      }

      const newTokens = await refreshResponse.json()
      const updatedTokens = {
        ...integration.tokens,
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in,
        expires_at: Date.now() / 1000 + newTokens.expires_in,
      }

      // Update tokens in database
      await supabaseClient
        .from('user_integrations')
        .update({
          tokens: updatedTokens,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id)

      integration.tokens = updatedTokens
    }

    // Create email content
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    const headers = [
      `To: ${emailData.to.join(', ')}`,
      emailData.cc && emailData.cc.length > 0 ? `Cc: ${emailData.cc.join(', ')}` : '',
      emailData.bcc && emailData.bcc.length > 0 ? `Bcc: ${emailData.bcc.join(', ')}` : '',
      `Subject: ${emailData.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: text/html; charset=UTF-8`,
      '',
    ].filter(header => header !== '').join('\r\n')

    const email = headers + '\r\n' + emailData.body
    
    // Base64 encode the email
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send email via Gmail API
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    })

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text()
      throw new Error(`Gmail API error: ${errorText}`)
    }

    const gmailResult = await gmailResponse.json()

    // Log email communication in database
    const { error: logError } = await supabaseClient
      .from('email_communications')
      .insert({
        user_id: user.id,
        customer_id: emailData.customerId,
        quote_id: emailData.quoteId,
        email_type: emailData.emailType || 'custom',
        subject: emailData.subject,
        body: emailData.body,
        recipients: emailData.to,
        cc: emailData.cc || [],
        bcc: emailData.bcc || [],
        status: 'sent',
        message_id: gmailResult.id,
        sent_at: new Date().toISOString(),
      })

    if (logError) {
      console.error('Failed to log email communication:', logError)
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: gmailResult.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Email send error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})