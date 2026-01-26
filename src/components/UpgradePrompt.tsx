import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';

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
  const { createCheckout } = useSubscription();

  const handleUpgrade = async () => {
    try {
      await createCheckout('year');
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="w-4 h-4" />
        <span>Pro feature</span>
        <Button 
          variant="link" 
          size="sm" 
          className="p-0 h-auto text-primary"
          onClick={handleUpgrade}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
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
          onClick={handleUpgrade}
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
  );
};

export default UpgradePrompt;
