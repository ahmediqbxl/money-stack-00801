import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Crown, Sparkles, Loader2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { STRIPE_PRICES, SUBSCRIPTION_TIERS } from '@/config/subscription';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ 
  feature, 
  description,
  compact = false 
}) => {
  const { createCheckout, isLoading } = useSubscription();
  const [showDialog, setShowDialog] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<'month' | 'year' | null>(null);

  const handleUpgrade = async (interval: 'month' | 'year') => {
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

  const PricingDialog = () => (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black text-center">
            Choose Your Plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Monthly Option */}
          <button
            onClick={() => handleUpgrade('month')}
            disabled={checkoutLoading !== null || isLoading}
            className="w-full p-4 border-2 border-foreground bg-card hover:bg-muted transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Monthly</p>
                <p className="text-sm text-muted-foreground">Flexible, cancel anytime</p>
              </div>
              <div className="text-right">
                <p className="font-black text-xl">
                  {formatPrice(STRIPE_PRICES.monthly.amount)}
                  <span className="text-sm font-normal text-muted-foreground"> CAD/mo</span>
                </p>
              </div>
            </div>
            {checkoutLoading === 'month' && (
              <div className="flex items-center justify-center mt-2">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </button>

          {/* Yearly Option */}
          <button
            onClick={() => handleUpgrade('year')}
            disabled={checkoutLoading !== null || isLoading}
            className="w-full p-4 border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left relative"
          >
            <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-bold px-2 py-1">
              SAVE 25%
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Yearly</p>
                <p className="text-sm text-muted-foreground">Best value</p>
              </div>
              <div className="text-right">
                <p className="font-black text-xl">
                  {formatPrice(STRIPE_PRICES.yearly.amount)}
                  <span className="text-sm font-normal text-muted-foreground"> CAD/yr</span>
                </p>
                <p className="text-xs text-primary font-medium">
                  Save ${SUBSCRIPTION_TIERS.pro.yearlySavings}/year
                </p>
              </div>
            </div>
            {checkoutLoading === 'year' && (
              <div className="flex items-center justify-center mt-2">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>Pro feature</span>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto text-primary"
            onClick={() => setShowDialog(true)}
          >
            Upgrade
          </Button>
        </div>
        <PricingDialog />
      </>
    );
  }

  return (
    <>
      <Card className="brutalist-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/20 flex items-center justify-center border-2 border-primary/30">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              {feature}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <Button 
            onClick={() => setShowDialog(true)}
            className="brutalist-button bg-primary text-primary-foreground"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </Button>
          <p className="text-xs text-muted-foreground">
            Starting at $10 CAD/month
          </p>
        </CardContent>
      </Card>
      <PricingDialog />
    </>
  );
};

export default UpgradePrompt;
