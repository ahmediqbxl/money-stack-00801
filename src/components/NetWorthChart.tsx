import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useNetWorth } from '@/hooks/useNetWorth';

const NetWorthChart = () => {
  const { snapshots } = useNetWorth();

  const chartData = useMemo(() => {
    // Get last 30 snapshots and reverse for chronological order
    return [...snapshots]
      .slice(0, 30)
      .reverse()
      .map(snapshot => ({
        date: new Date(snapshot.snapshot_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        netWorth: snapshot.net_worth,
        assets: snapshot.total_assets,
        liabilities: snapshot.total_liabilities,
      }));
  }, [snapshots]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="brutalist-card bg-card p-4 border-2">
          <p className="font-bold mb-2">{label}</p>
          <p className="text-accent font-bold">
            Net Worth: ${payload[0]?.value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length < 2) {
    return (
      <div className="brutalist-card p-8 text-center">
        <p className="text-muted-foreground font-bold uppercase tracking-wider mb-2">
          Net Worth Over Time
        </p>
        <p className="text-sm text-muted-foreground">
          Keep tracking to see your progress. Chart will appear after 2+ days of data.
        </p>
      </div>
    );
  }

  return (
    <div className="brutalist-card p-6">
      <h3 className="font-display font-black text-xl mb-6 uppercase tracking-tight">
        Net Worth History
      </h3>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--muted-foreground))" 
              opacity={0.3}
            />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickLine={{ stroke: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--foreground))', strokeWidth: 2 }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickLine={{ stroke: 'hsl(var(--foreground))' }}
              axisLine={{ stroke: 'hsl(var(--foreground))', strokeWidth: 2 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="hsl(var(--primary))"
              strokeWidth={4}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--foreground))', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NetWorthChart;
