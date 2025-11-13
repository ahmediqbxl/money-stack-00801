
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    console.log('🔄 get-plaid-credentials function called')
    console.log('📊 Request method:', req.method)
    console.log('📊 Request headers:', Object.fromEntries(req.headers.entries()))
    
    // Get Plaid credentials from environment variables
    const clientId = Deno.env.get('PLAID_CLIENT_ID')
    const secret = Deno.env.get('PLAID_SECRET_KEY')

    console.log('🔍 Environment check:')
    console.log('  - PLAID_CLIENT_ID exists:', !!clientId)
    console.log('  - PLAID_SECRET_KEY exists:', !!secret)
    
    if (clientId) {
      console.log('  - PLAID_CLIENT_ID length:', clientId.length)
      console.log('  - PLAID_CLIENT_ID preview:', clientId.substring(0, 8) + '...')
    }
    
    if (secret) {
      console.log('  - PLAID_SECRET_KEY length:', secret.length)
      console.log('  - PLAID_SECRET_KEY preview:', secret.substring(0, 8) + '...')
    }

    if (!clientId || !secret) {
      console.error('❌ Missing Plaid credentials in environment')
      console.error('Available env vars:', Object.keys(Deno.env.toObject()).filter(key => key.includes('PLAID')))
      
      return new Response(
        JSON.stringify({ 
          error: 'Plaid credentials not configured in environment',
          client_id: null,
          secret: null,
          debug: {
            hasClientId: !!clientId,
            hasSecret: !!secret,
            availablePlaidVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('PLAID'))
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log('✅ Returning Plaid credentials successfully')
    const response = {
      client_id: clientId,
      secret: secret,
      success: true
    };
    
    console.log('📤 Response:', { ...response, secret: '[HIDDEN]' });
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('💥 Error in get-plaid-credentials:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        client_id: null,
        secret: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
