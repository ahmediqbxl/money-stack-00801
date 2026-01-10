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
    console.log('🔄 create-plaid-link-token function called')
    
    const { userId, accessToken } = await req.json()
    console.log('📊 User ID:', userId, 'Update mode:', !!accessToken)
    
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
    
    // Get appropriate Plaid credentials based on user type
    const clientId = isTestUser 
      ? Deno.env.get('PLAID_SANDBOX_CLIENT_ID')
      : Deno.env.get('PLAID_CLIENT_ID')
    const secret = isTestUser
      ? Deno.env.get('PLAID_SANDBOX_SECRET_KEY')
      : Deno.env.get('PLAID_SECRET_KEY')
    const apiUrl = isTestUser
      ? 'https://sandbox.plaid.com/link/token/create'
      : 'https://production.plaid.com/link/token/create'

    console.log('🔍 Credential check:', {
      hasClientId: !!clientId,
      hasSecret: !!secret,
      clientIdPrefix: clientId ? clientId.substring(0, 8) + '...' : 'missing',
      secretPrefix: secret ? secret.substring(0, 8) + '...' : 'missing'
    });

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

    console.log('🏗️ Building link token request...', { isUpdateMode: !!accessToken })
    
    // Build request - use access_token for update mode, products for new connection
    const request: any = {
      client_id: clientId,
      secret: secret,
      client_name: 'MoneyStack',
      country_codes: ['US', 'CA'],
      language: 'en',
      user: {
        client_user_id: userId,
      },
    }
    
    if (accessToken) {
      // Update mode - use access_token instead of products
      request.access_token = accessToken
      console.log('🔄 Creating link token in UPDATE mode for re-authentication')
    } else {
      // New connection mode - use products
      request.products = ['transactions', 'investments']
      console.log('🆕 Creating link token for NEW connection')
    }

    console.log(`🌐 Making request to Plaid ${environment} API...`)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    console.log(`📥 Plaid ${environment} API response status:`, response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Plaid ${environment} API error:`, response.status, errorText)
      
      // Parse error details for better reporting
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error_code === 'INVALID_API_KEYS') {
          return new Response(
            JSON.stringify({ 
              error: 'INVALID_API_KEYS',
              message: 'Invalid Plaid credentials: Please verify your production PLAID_CLIENT_ID and PLAID_SECRET_KEY are correct and active.',
              details: errorData 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        }
      } catch (parseError) {
        console.log('Could not parse error response:', parseError);
      }
      
      return new Response(
        JSON.stringify({ error: `Plaid ${environment} API error: ${response.status}`, details: errorText }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        },
      )
    }

    const data = await response.json()
    console.log(`📊 Plaid ${environment} API response received`)
    
    if (data.error_code) {
      console.error(`❌ Plaid ${environment} API error:`, data.error_code, '-', data.error_message)
      return new Response(
        JSON.stringify({ error: `${data.error_code}: ${data.error_message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log(`✅ ${environment} link token created successfully`)
    return new Response(
      JSON.stringify({ link_token: data.link_token }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('💥 Error in create-plaid-link-token:', error)
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
