import React from 'react';
import { Wallet } from 'lucide-react';
import PricingCards from '@/components/PricingCards';
import Footer from '@/components/Footer';

interface SubscriptionLandingProps {
  onContinueFree: () => void;
}

const SubscriptionLanding: React.FC<SubscriptionLandingProps> = ({ onContinueFree }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-foreground bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-primary flex items-center justify-center border-2 border-foreground">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="font-display text-2xl font-black tracking-tight">
                MONEYSTACK
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Track Everything
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <h2 className="font-display text-4xl md:text-5xl font-black">
              Choose Your Plan
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start tracking your net worth for free, or unlock automated bank syncing 
              with our Pro plan. Cancel anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <PricingCards onContinueFree={onContinueFree} />

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 border-t-2 border-foreground/10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>256-bit encryption</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>Powered by Plaid</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SubscriptionLanding;
