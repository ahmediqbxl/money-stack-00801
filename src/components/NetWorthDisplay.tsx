import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNetWorth } from '@/hooks/useNetWorth';

const NetWorthDisplay = () => {
  const { calculateNetWorth, snapshots } = useNetWorth();
  const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth();

  // Calculate change from previous day
  const previousSnapshot = snapshots[1]; // Index 0 is today, 1 is yesterday
  const change = previousSnapshot ? netWorth - previousSnapshot.net_worth : 0;
  const changePercent = previousSnapshot && previousSnapshot.net_worth !== 0
    ? ((change / Math.abs(previousSnapshot.net_worth)) * 100).toFixed(1)
    : '0.0';

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (absValue >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const isPositive = netWorth >= 0;
  const isChangePositive = change >= 0;

  return (
    <div className="space-y-8">
      {/* Main Net Worth Display */}
      <div className="brutalist-card bg-card p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Total Net Worth
        </p>
        <div className={`text-6xl md:text-8xl font-display font-black tracking-tight ${
          isPositive ? 'text-accent' : 'text-destructive'
        }`}>
          {netWorth < 0 && '-'}${Math.abs(netWorth).toLocaleString()}
        </div>
        
        {/* Change indicator */}
        {previousSnapshot && (
          <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 border-2 border-foreground ${
            isChangePositive ? 'bg-accent/20' : 'bg-destructive/20'
          }`}>
            {isChangePositive ? (
              <ArrowUpRight className="w-5 h-5" />
            ) : (
              <ArrowDownRight className="w-5 h-5" />
            )}
            <span className="font-bold">
              {isChangePositive ? '+' : ''}{formatCurrency(change)} ({changePercent}%)
            </span>
            <span className="text-muted-foreground text-sm">vs yesterday</span>
          </div>
        )}
      </div>

      {/* Assets and Liabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="brutalist-card bg-accent/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-accent flex items-center justify-center border-2 border-foreground">
              <TrendingUp className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Total Assets
              </p>
              <p className="text-3xl font-display font-black text-accent">
                ${totalAssets.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Liabilities */}
        <div className="brutalist-card bg-destructive/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-destructive flex items-center justify-center border-2 border-foreground">
              <TrendingDown className="w-6 h-6 text-destructive-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Total Liabilities
              </p>
              <p className="text-3xl font-display font-black text-destructive">
                ${totalLiabilities.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetWorthDisplay;
