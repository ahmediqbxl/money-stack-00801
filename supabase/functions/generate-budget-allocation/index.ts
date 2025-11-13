
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('open_api_key');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { totalSpent, categorySpending, currentBudgets, spendingData } = await req.json();

    const prompt = `You are a financial advisor AI. Analyze the following spending data and provide optimized budget allocations.

Current spending data:
${spendingData}
Total monthly spending: $${totalSpent.toFixed(2)}

Current budget allocations:
${currentBudgets.map((b: any) => `${b.name}: $${b.budget} (spent: $${b.spent})`).join('\n')}

Please provide budget recommendations that:
1. Are realistic based on spending patterns
2. Include a 10-20% buffer for overspending
3. Prioritize essential categories (food, transportation, bills)
4. Consider seasonal variations
5. Aim to reduce spending in over-budget categories

Respond with a JSON object in this exact format:
{
  "budgetAllocation": [
    {
      "category": "Category Name",
      "currentSpending": 500,
      "recommendedBudget": 550,
      "reasoning": "Brief explanation"
    }
  ],
  "totalRecommendedBudget": 2500,
  "budgetingAdvice": "Overall advice for better budgeting"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial advisor AI that provides practical budget allocation advice. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response from GPT
    let budgetAllocation;
    try {
      budgetAllocation = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError);
      throw new Error('Invalid response format from AI');
    }

    return new Response(JSON.stringify(budgetAllocation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-budget-allocation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
