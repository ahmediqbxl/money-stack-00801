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
    <div className="space-y-4 sm:space-y-8">
      {/* Main Net Worth Display */}
      <div className="brutalist-card bg-card p-4 sm:p-8 text-center">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2">
          Total Net Worth
        </p>
        <div className={`text-4xl sm:text-6xl md:text-8xl font-display font-black tracking-tight ${
          isPositive ? 'text-accent' : 'text-destructive'
        }`}>
          {netWorth < 0 && '-'}${Math.abs(netWorth).toLocaleString()}
        </div>
        
        {/* Change indicator */}
        {previousSnapshot && (
          <div className={`inline-flex flex-wrap items-center justify-center gap-1 sm:gap-2 mt-3 sm:mt-4 px-2 sm:px-4 py-1.5 sm:py-2 border-2 border-foreground ${
            isChangePositive ? 'bg-accent/20' : 'bg-destructive/20'
          }`}>
            {isChangePositive ? (
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="font-bold text-sm sm:text-base">
              {isChangePositive ? '+' : ''}{formatCurrency(change)} ({changePercent}%)
            </span>
            <span className="text-muted-foreground text-xs sm:text-sm">vs yesterday</span>
          </div>
        )}
      </div>

      {/* Assets and Liabilities */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {/* Assets */}
        <div className="brutalist-card bg-accent/10 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent flex items-center justify-center border-2 border-foreground flex-shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Assets
              </p>
              <p className="text-xl sm:text-3xl font-display font-black text-accent truncate">
                ${totalAssets.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Liabilities */}
        <div className="brutalist-card bg-destructive/10 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-destructive flex items-center justify-center border-2 border-foreground flex-shrink-0">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-destructive-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Liabilities
              </p>
              <p className="text-xl sm:text-3xl font-display font-black text-destructive truncate">
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
