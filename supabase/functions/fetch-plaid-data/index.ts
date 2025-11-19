
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
    console.log('🔄 fetch-plaid-data function called')
    
    const { accessToken, userId, daysBack = 90, maxTransactions = 2000 } = await req.json()
    console.log('📊 Request parameters:', { daysBack, maxTransactions })
    
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
    const apiBaseUrl = isTestUser
      ? 'https://sandbox.plaid.com'
      : 'https://production.plaid.com'

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

    console.log(`📡 Fetching accounts from Plaid ${environment} API...`)
    const accountsResponse = await fetch(`${apiBaseUrl}/accounts/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        secret: secret,
        access_token: accessToken,
      }),
    })

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text()
      console.error(`❌ ${environment} Accounts API error:`, accountsResponse.status, errorText)
      throw new Error(`${environment} Accounts API error: ${accountsResponse.status}`)
    }

    const accountsData = await accountsResponse.json()
    console.log(`✅ ${environment} accounts data received successfully:`, {
      accountsCount: accountsData.accounts?.length || 0,
      accounts: accountsData.accounts?.map((acc: any) => ({
        id: acc.account_id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        balance: acc.balances?.current
      }))
    })

    // Fetch investment holdings for investment accounts
    console.log(`📡 Fetching investment holdings from Plaid ${environment} API...`)
    let investmentHoldings = []
    let investmentSecurities = []
    
    try {
      const holdingsResponse = await fetch(`${apiBaseUrl}/investments/holdings/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          secret: secret,
          access_token: accessToken,
        }),
      })

      if (holdingsResponse.ok) {
        const holdingsData = await holdingsResponse.json()
        investmentHoldings = holdingsData.holdings || []
        investmentSecurities = holdingsData.securities || []
        console.log('✅ Investment holdings received:', {
          holdingsCount: investmentHoldings.length,
          securitiesCount: investmentSecurities.length
        })
      } else {
        const errorText = await holdingsResponse.text()
        console.log('⚠️ Investment holdings fetch failed (may not have investment accounts):', errorText)
      }
    } catch (error) {
      console.log('⚠️ Investment holdings fetch error (continuing without holdings):', error)
    }

    // Calculate date range for transactions
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log(`📡 Starting ${environment} transaction fetch...`, { 
      startDate, 
      endDate, 
      daysBack,
      maxTransactions
    })

    // Fetch transactions
    console.log(`📡 Fetching ${environment} transactions...`)
    const transactionsResponse = await fetch(`${apiBaseUrl}/transactions/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        secret: secret,
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
      }),
    })

    let allTransactions = []
    let totalAvailable = 0
    let requestCount = 1

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text()
      console.error(`❌ ${environment} Transactions API error:`, transactionsResponse.status, errorText)
      
      // Try with a longer date range - maybe the account has older transactions
      console.log('⚠️ Trying with extended date range (730 days)...')
      const extendedStartDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const retryResponse = await fetch(`${apiBaseUrl}/transactions/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          secret: secret,
          access_token: accessToken,
          start_date: extendedStartDate,
          end_date: endDate,
        }),
      })

      if (!retryResponse.ok) {
        const retryErrorText = await retryResponse.text()
        console.error('❌ Extended date range also failed:', retryResponse.status, retryErrorText)
        
        // Return accounts but indicate transaction fetch failed
        return new Response(
          JSON.stringify({
            accounts: accountsData.accounts || [],
            transactions: [],
            metadata: {
              totalTransactions: 0,
              totalAvailable: 0,
              dateRange: { startDate, endDate },
              daysBack,
              requestCount: 1,
              error: `Transaction fetch failed: ${retryErrorText}`,
              extendedRangeTried: true
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      const retryData = await retryResponse.json()
      allTransactions = retryData.transactions || []
      totalAvailable = retryData.total_transactions || 0
      console.log('✅ Extended date range worked:', {
        transactions: allTransactions.length,
        totalAvailable,
        dateRange: `${extendedStartDate} to ${endDate}`
      })
    } else {
      const transactionsData = await transactionsResponse.json()
      allTransactions = transactionsData.transactions || []
      totalAvailable = transactionsData.total_transactions || 0

      console.log('✅ Initial transaction fetch completed:', {
        received: allTransactions.length,
        totalAvailable,
        dateRange: `${startDate} to ${endDate}`
      })
    }
    
    console.log('✅ Production transaction fetching completed:', {
      finalCount: allTransactions.length,
      totalAvailable,
      dateRange: `${startDate} to ${endDate}`,
      requestCount,
      sampleTransaction: allTransactions[0] ? {
        id: allTransactions[0].transaction_id,
        name: allTransactions[0].name,
        amount: allTransactions[0].amount,
        date: allTransactions[0].date,
        account_id: allTransactions[0].account_id
      } : null
    })

    const responseData = {
      accounts: accountsData.accounts || [],
      transactions: allTransactions,
      holdings: investmentHoldings,
      securities: investmentSecurities,
      metadata: {
        totalTransactions: allTransactions.length,
        totalAvailable,
        dateRange: { startDate, endDate },
        daysBack,
        requestCount,
        hasInvestmentData: investmentHoldings.length > 0
      }
    }

    console.log('🎉 Successfully returning production Plaid data:', {
      accountsCount: responseData.accounts.length,
      transactionsCount: responseData.transactions.length,
      totalAvailable,
      dateRangeDays: daysBack
    })

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('💥 Error in fetch-plaid-data:', error)
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
