import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { STRIPE_PRICES, type SubscriptionTier, type SubscriptionInterval } from '@/config/subscription';

interface SubscriptionState {
  isLoading: boolean;
  isSubscribed: boolean;
  tier: SubscriptionTier;
  interval: SubscriptionInterval | null;
  priceId: string | null;
  subscriptionEnd: string | null;
  error: string | null;
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  createCheckout: (interval: SubscriptionInterval) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  isProFeature: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [state, setState] = useState<SubscriptionState>({
    isLoading: true,
    isSubscribed: false,
    tier: 'free',
    interval: null,
    priceId: null,
    subscriptionEnd: null,
    error: null,
  });

  // Check if user is admin
  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return false;
    }
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    const adminStatus = data?.role === 'admin';
    setIsAdmin(adminStatus);
    return adminStatus;
  }, [user]);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, isLoading: false, isSubscribed: false, tier: 'free' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // First check if user is admin - admins get Pro access automatically
      const adminStatus = await checkAdminStatus();
      if (adminStatus) {
        setState({
          isLoading: false,
          isSubscribed: true,
          tier: 'pro',
          interval: null,
          priceId: null,
          subscriptionEnd: null,
          error: null,
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.subscribed) {
        setState({
          isLoading: false,
          isSubscribed: true,
          tier: 'pro',
          interval: data.interval || null,
          priceId: data.price_id || null,
          subscriptionEnd: data.subscription_end || null,
          error: null,
        });
      } else {
        setState({
          isLoading: false,
          isSubscribed: false,
          tier: 'free',
          interval: null,
          priceId: null,
          subscriptionEnd: null,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check subscription',
      }));
    }
  }, [session?.access_token, checkAdminStatus]);

  const createCheckout = useCallback(async (interval: SubscriptionInterval) => {
    if (!session?.access_token) {
      throw new Error('Must be logged in to subscribe');
    }

    const priceId = interval === 'month' 
      ? STRIPE_PRICES.monthly.priceId 
      : STRIPE_PRICES.yearly.priceId;

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  }, [session?.access_token]);

  const openCustomerPortal = useCallback(async () => {
    if (!session?.access_token) {
      throw new Error('Must be logged in to manage subscription');
    }

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  }, [session?.access_token]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setState({
        isLoading: false,
        isSubscribed: false,
        tier: 'free',
        interval: null,
        priceId: null,
        subscriptionEnd: null,
        error: null,
      });
    }
  }, [user, checkSubscription]);

  // Check subscription on URL change (for post-checkout)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'success') {
      // Delay to allow Stripe webhook to process
      setTimeout(() => {
        checkSubscription();
      }, 2000);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkSubscription]);

  // Periodic subscription check (every 60 seconds)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const value: SubscriptionContextType = {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    isProFeature: state.tier === 'pro',
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
