
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      console.error('Available env vars:', Object.keys(Deno.env.toObject()));
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing', transactions.length, 'transactions');
    console.log('Using OpenAI API key:', openAIApiKey.substring(0, 10) + '...');
    
    // Create prompt with original descriptions for AI categorization
    const transactionDescriptions = transactions.map((t: any) => 
      `- ${t.description} ($${Math.abs(t.amount)}) at ${t.merchant || 'Unknown'}`
    ).join('\n');

    const prompt = `Categorize these financial transactions into one of these categories: 
    "Food & Dining", "Transportation", "Shopping", "Entertainment", "Bills & Utilities", "Healthcare", "Income", "Transfer", "Other".
    
    Transactions:
    ${transactionDescriptions}
    
    Respond with ONLY a JSON array where each object has "originalDescription" and "category" fields. Use the exact original description from each transaction (before the amount and merchant info).
    
    Example format:
    [
      {"originalDescription": "Uber 063015 SF**POOL**", "category": "Transportation"},
      {"originalDescription": "United Airlines", "category": "Transportation"}
    ]`;

    console.log('Making API call to OpenAI');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a financial transaction categorization expert. Always respond with valid JSON only, no markdown formatting. Use the exact original transaction description (the part before the amount and merchant).' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, response.statusText, errorText);
      
      // Fallback to rule-based categorization if OpenAI fails
      console.log('Falling back to rule-based categorization');
      const categorizedTransactions = transactions.map((transaction: any) => {
        const description = transaction.description.toLowerCase();
        const merchant = (transaction.merchant || '').toLowerCase();
        
        let category = 'Other';
        
        if (description.includes('grocery') || description.includes('food') || merchant.includes('restaurant') || merchant.includes('tim hortons') || merchant.includes('mcdonald') || description.includes('metro') || description.includes('starbucks')) {
          category = 'Food & Dining';
        } else if (description.includes('uber') || description.includes('taxi') || description.includes('transit') || description.includes('gas') || merchant.includes('shell') || description.includes('ttc')) {
          category = 'Transportation';
        } else if (description.includes('amazon') || description.includes('shop') || merchant.includes('canadian tire') || description.includes('target') || description.includes('sparkfun')) {
          category = 'Shopping';
        } else if (description.includes('netflix') || description.includes('spotify') || description.includes('entertainment')) {
          category = 'Entertainment';
        } else if (description.includes('hydro') || description.includes('bell') || description.includes('rogers') || description.includes('utility') || description.includes('bill')) {
          category = 'Bills & Utilities';
        } else if (description.includes('pharmacy') || description.includes('drug mart') || description.includes('medical')) {
          category = 'Healthcare';
        } else if (description.includes('deposit') || description.includes('salary') || description.includes('payroll') || transaction.amount > 0) {
          category = 'Income';
        } else if (description.includes('airline') || description.includes('united') || description.includes('air canada')) {
          category = 'Transportation';
        }
        
        return {
          ...transaction,
          category: category,
          originalDescription: transaction.description
        };
      });

      return new Response(
        JSON.stringify({ categorizedTransactions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received successfully');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    let responseContent = data.choices[0].message.content.trim();
    console.log('OpenAI response content:', responseContent);

    // Clean up markdown formatting
    responseContent = responseContent
      .replace(/^```json\s*/g, '')
      .replace(/^```\s*/g, '')
      .replace(/\s*```$/g, '')
      .replace(/^\s*[\r\n]+/g, '')
      .replace(/[\r\n]+\s*$/g, '')
      .trim();

    console.log('Cleaned response content:', responseContent);

    let categorizations;
    try {
      categorizations = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Cleaned response content was:', responseContent);
      
      // Fallback to rule-based categorization if JSON parsing fails
      console.log('Falling back to rule-based categorization due to parse error');
      const categorizedTransactions = transactions.map((transaction: any) => {
        const description = transaction.description.toLowerCase();
        const merchant = (transaction.merchant || '').toLowerCase();
        
        let category = 'Other';
        
        if (description.includes('grocery') || description.includes('food') || merchant.includes('restaurant') || merchant.includes('tim hortons') || merchant.includes('mcdonald') || description.includes('metro') || description.includes('starbucks')) {
          category = 'Food & Dining';
        } else if (description.includes('uber') || description.includes('taxi') || description.includes('transit') || description.includes('gas') || merchant.includes('shell') || description.includes('ttc')) {
          category = 'Transportation';
        } else if (description.includes('amazon') || description.includes('shop') || merchant.includes('canadian tire') || description.includes('target') || description.includes('sparkfun')) {
          category = 'Shopping';
        } else if (description.includes('netflix') || description.includes('spotify') || description.includes('entertainment')) {
          category = 'Entertainment';
        } else if (description.includes('hydro') || description.includes('bell') || description.includes('rogers') || description.includes('utility') || description.includes('bill')) {
          category = 'Bills & Utilities';
        } else if (description.includes('pharmacy') || description.includes('drug mart') || description.includes('medical')) {
          category = 'Healthcare';
        } else if (description.includes('deposit') || description.includes('salary') || description.includes('payroll') || transaction.amount > 0) {
          category = 'Income';
        } else if (description.includes('airline') || description.includes('united') || description.includes('air canada')) {
          category = 'Transportation';
        }
        
        return {
          ...transaction,
          category: category,
          originalDescription: transaction.description
        };
      });

      return new Response(
        JSON.stringify({ categorizedTransactions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced matching logic - match using exact original descriptions
    const categorizedTransactions = transactions.map((transaction: any) => {
      // Find exact match using original description
      const match = categorizations.find((cat: any) => 
        cat.originalDescription === transaction.description
      );
      
      // Log matching process for debugging
      if (match) {
        console.log(`✅ Matched "${transaction.description}" with category "${match.category}"`);
      } else {
        console.log(`⚠️ No match found for "${transaction.description}"`);
        console.log('Available categorizations:', categorizations.map((c: any) => c.originalDescription));
      }
      
      return {
        ...transaction,
        category: match ? match.category : 'Other',
        originalDescription: transaction.description
      };
    });

    console.log('Successfully categorized', categorizedTransactions.length, 'transactions');
    console.log('Categories assigned:', categorizedTransactions.map((t: any) => ({ desc: t.description, cat: t.category })));

    return new Response(
      JSON.stringify({ categorizedTransactions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error categorizing transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
