// MoneyStack Pro subscription pricing configuration
// Currency: CAD

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Manual account tracking',
      'Unlimited manual accounts',
      'Net worth calculation',
      'Basic goal setting',
    ],
    limitations: [
      'No automated bank sync',
      'No historical data',
      'No investment tracking',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 10,
    yearlyPrice: 90,
    yearlySavings: 30,
    currency: 'CAD',
    features: [
      'Everything in Free',
      'Automated Plaid bank sync',
      'Real-time balance updates',
      'Investment account tracking',
      'Historical net worth trends',
      'Transaction history',
      'Priority support',
    ],
  },
} as const;

export const STRIPE_PRICES = {
  monthly: {
    priceId: 'price_1Stwv2CdCJmX7Vmj7XbyY1SN',
    productId: 'prod_TrgH7depFsXF0E',
    amount: 1000, // $10.00 CAD in cents
    interval: 'month' as const,
  },
  yearly: {
    priceId: 'price_1StwhxCdCJmX7VmjXoDZv9m6',
    productId: 'prod_Trg4D9v1Do2yMB',
    amount: 9000, // $90.00 CAD in cents
    interval: 'year' as const,
  },
} as const;

export type SubscriptionInterval = 'month' | 'year';
export type SubscriptionTier = 'free' | 'pro';
