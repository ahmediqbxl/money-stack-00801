
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { totalSpent, categorySpending, currentBudgets, spendingData, requestType = 'budget' } = await req.json();
    
    console.log('Request type:', requestType);
    console.log('Total spent:', totalSpent);

    let prompt: string;
    let systemPrompt: string;

    if (requestType === 'insights') {
      // Generate financial insights
      systemPrompt = 'You are a financial advisor AI that provides actionable insights and savings opportunities. Always respond with valid JSON only.';
      prompt = `Analyze this spending data and provide 3-5 actionable financial insights.

Current spending data:
${spendingData}
Total monthly spending: $${totalSpent.toFixed(2)}

Current budget allocations:
${currentBudgets.map((b: any) => `${b.name}: $${b.budget} (spent: $${b.spent})`).join('\n')}

Provide insights in this exact JSON format:
{
  "insights": [
    {
      "type": "savings" | "budget" | "investment" | "warning",
      "title": "Brief title",
      "description": "Detailed actionable advice",
      "potential": 100.00,
      "difficulty": "Easy" | "Medium" | "Hard",
      "category": "Category name if applicable"
    }
  ]
}

Focus on:
1. Over-budget categories with specific reduction strategies
2. Highest spending categories with optimization opportunities
3. Emergency fund recommendations
4. Potential subscription or recurring charge optimizations
5. Seasonal spending patterns`;

    } else {
      // Generate budget allocation
      systemPrompt = 'You are a financial advisor AI that provides practical budget allocation advice. Always respond with valid JSON only.';
      prompt = `Analyze the following spending data and provide optimized budget allocations.

Current spending data:
${spendingData}
Total monthly spending: $${totalSpent.toFixed(2)}

Current budget allocations:
${currentBudgets.map((b: any) => `${b.name}: $${b.budget} (spent: $${b.spent})`).join('\n')}

Provide budget recommendations that:
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
    }

    console.log('Calling Lovable AI with model: google/gemini-2.5-flash');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Lovable AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received');
    
    const content = data.choices[0].message.content;

    // Parse the JSON response from AI
    let result;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
      console.log('Successfully parsed AI response');
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw content:', content);
      throw new Error('Invalid response format from AI');
    }

    return new Response(JSON.stringify(result), {
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
