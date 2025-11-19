
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 exchange-plaid-token function called')
    
    const { publicToken, userId } = await req.json()
    console.log('📊 Token exchange request received')
    
    // Initialize Supabase client to check user type
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check if user is a test user
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_test_user')
      .eq('id', userId)
      .single()
    
    const isTestUser = profile?.is_test_user || false
    const environment = isTestUser ? 'Sandbox' : 'Production'
    console.log(`🎯 User environment: ${environment}`)
    
    // Get appropriate Plaid credentials
    const clientId = isTestUser
      ? Deno.env.get('PLAID_SANDBOX_CLIENT_ID')
      : Deno.env.get('PLAID_CLIENT_ID')
    const secret = isTestUser
      ? Deno.env.get('PLAID_SANDBOX_SECRET_KEY')
      : Deno.env.get('PLAID_SECRET_KEY')
    const apiUrl = isTestUser
      ? 'https://sandbox.plaid.com/item/public_token/exchange'
      : 'https://production.plaid.com/item/public_token/exchange'

    if (!clientId || !secret) {
      console.error('❌ Missing Plaid credentials')
      return new Response(
        JSON.stringify({ error: 'Plaid credentials not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    console.log('🔄 Exchanging public token...')
    const request = {
      client_id: clientId,
      secret: secret,
      public_token: publicToken,
    }

    console.log(`🌐 Making request to Plaid ${environment} API...`)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    console.log(`📥 ${environment} token exchange response status:`, response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ ${environment} token exchange error:`, response.status, errorText)
      return new Response(
        JSON.stringify({ error: `${environment} token exchange error: ${response.status}`, details: errorText }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        },
      )
    }

    const data = await response.json()
    console.log(`📊 ${environment} token exchange response received`)
    
    if (data.error_code) {
      console.error(`❌ ${environment} token exchange API error:`, data.error_code, '-', data.error_message)
      return new Response(
        JSON.stringify({ error: `${data.error_code}: ${data.error_message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log(`✅ ${environment} access token received successfully`)
    return new Response(
      JSON.stringify({ access_token: data.access_token }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('💥 Error in exchange-plaid-token:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
      },
    )
  }
})
