import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, Crown, Wallet } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_TIERS, STRIPE_PRICES } from '@/config/subscription';

interface PricingCardsProps {
  onContinueFree?: () => void;
}

const PricingCards: React.FC<PricingCardsProps> = ({ onContinueFree }) => {
  const { createCheckout, isSubscribed, tier, isLoading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleSubscribe = async (interval: 'month' | 'year') => {
    setCheckoutLoading(interval);
    try {
      await createCheckout(interval);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="space-y-8">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingInterval('month')}
          className={`px-4 py-2 font-bold uppercase text-sm transition-all ${
            billingInterval === 'month'
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          } border-2 border-foreground`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingInterval('year')}
          className={`px-4 py-2 font-bold uppercase text-sm transition-all relative ${
            billingInterval === 'year'
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          } border-2 border-foreground`}
        >
          Yearly
          <Badge className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-xs">
            Save 25%
          </Badge>
        </button>
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Free Tier */}
        <Card className={`brutalist-card relative ${tier === 'free' && !isSubscribed ? 'ring-2 ring-primary' : ''}`}>
          {tier === 'free' && !isSubscribed && (
            <Badge className="absolute -top-3 left-4 bg-primary text-primary-foreground">
              Current Plan
            </Badge>
          )}
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center border-2 border-foreground">
              <Wallet className="w-6 h-6" />
            </div>
            <CardTitle className="font-display text-2xl font-black">FREE</CardTitle>
            <CardDescription className="text-muted-foreground">
              Manual tracking only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {SUBSCRIPTION_TIERS.free.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-primary/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
              {SUBSCRIPTION_TIERS.free.limitations.map((limitation) => (
                <div key={limitation} className="flex items-center gap-3 opacity-50">
                  <div className="w-5 h-5 bg-muted flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </div>
                  <span className="text-sm line-through">{limitation}</span>
                </div>
              ))}
            </div>
            {onContinueFree && tier !== 'pro' && (
              <Button
                variant="outline"
                className="w-full brutalist-button"
                onClick={onContinueFree}
              >
                Continue Free
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card className={`brutalist-card relative border-primary ${tier === 'pro' ? 'ring-2 ring-primary' : ''}`}>
          {tier === 'pro' ? (
            <Badge className="absolute -top-3 left-4 bg-primary text-primary-foreground">
              Your Plan
            </Badge>
          ) : (
            <Badge className="absolute -top-3 left-4 bg-foreground text-background">
              Recommended
            </Badge>
          )}
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 mx-auto mb-4 bg-primary flex items-center justify-center border-2 border-foreground">
              <Crown className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl font-black">PRO</CardTitle>
            <CardDescription className="text-muted-foreground">
              Automated Plaid sync
            </CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-black">
                {billingInterval === 'month' 
                  ? formatPrice(STRIPE_PRICES.monthly.amount)
                  : formatPrice(STRIPE_PRICES.yearly.amount)
                }
              </span>
              <span className="text-muted-foreground">
                /{billingInterval === 'month' ? 'month' : 'year'}
              </span>
            </div>
            {billingInterval === 'year' && (
              <p className="text-sm text-primary font-medium mt-1">
                Save ${SUBSCRIPTION_TIERS.pro.yearlySavings}/year
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {SUBSCRIPTION_TIERS.pro.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
            {tier !== 'pro' && (
              <Button
                className="w-full brutalist-button bg-primary text-primary-foreground"
                onClick={() => handleSubscribe(billingInterval)}
                disabled={checkoutLoading !== null || isLoading}
              >
                {checkoutLoading === billingInterval ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PricingCards;
