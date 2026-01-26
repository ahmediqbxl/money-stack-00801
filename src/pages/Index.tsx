import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, Shield, RefreshCw, Plus, Wallet, Crown, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import PlaidConnect, { PlaidConnectRef } from '@/components/PlaidConnect';
import { usePlaidData } from '@/hooks/usePlaidData';
import NetWorthDisplay from '@/components/NetWorthDisplay';
import AccountsList from '@/components/AccountsList';
import NetWorthChart from '@/components/NetWorthChart';
import GoalsSection from '@/components/GoalsSection';
import Footer from '@/components/Footer';
import SubscriptionLanding from '@/components/SubscriptionLanding';
import UpgradePrompt from '@/components/UpgradePrompt';

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [hasSeenLanding, setHasSeenLanding] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { isSubscribed, isLoading: subscriptionLoading, tier, openCustomerPortal } = useSubscription();
  const navigate = useNavigate();
  const plaidConnectRef = useRef<PlaidConnectRef>(null);
  
  const { 
    accounts,
    isLoading, 
    fetchPlaidData,
    handlePlaidSuccess,
    requiresReauth,
    plaidAccessToken,
    clearReauthFlag,
  } = usePlaidData();

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setIsAdmin(data?.role === 'admin');
    };

    checkAdminStatus();
  }, [user]);

  // Check if user has seen landing before (has accounts or is subscribed)
  useEffect(() => {
    if (subscriptionLoading) return;
    
    if (isSubscribed || accounts.length > 0) {
      setShowLanding(false);
      setHasSeenLanding(true);
    } else if (!hasSeenLanding) {
      setShowLanding(true);
    }
  }, [isSubscribed, accounts.length, subscriptionLoading, hasSeenLanding]);

  const handleContinueFree = () => {
    setShowLanding(false);
    setHasSeenLanding(true);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You've been successfully signed out.",
    });
  };

  const handleRefresh = async () => {
    if (!isSubscribed) {
      toast({
        title: "Pro Feature",
        description: "Upgrade to Pro to sync your bank accounts automatically.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Refreshing...",
      description: "Fetching latest account balances",
    });
    await fetchPlaidData();
  };

  const handleAddAccount = () => {
    if (!isSubscribed) {
      toast({
        title: "Pro Feature",
        description: "Upgrade to Pro to link your bank accounts.",
        variant: "destructive",
      });
      return;
    }
    plaidConnectRef.current?.connect();
  };

  const handleConnectSuccess = async (accessToken: string) => {
    await handlePlaidSuccess(accessToken);
    toast({
      title: "Account Connected",
      description: "Your bank account has been successfully connected!",
    });
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not open subscription management. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show loading state
  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show subscription landing for new free users
  if (showLanding && !isSubscribed) {
    return <SubscriptionLanding onContinueFree={handleContinueFree} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-foreground bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary flex items-center justify-center border-2 border-foreground">
                <Wallet className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-black tracking-tight">
                  MONEYSTACK
                </h1>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Track Everything
                </p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              {/* Subscription Badge */}
              {isSubscribed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageSubscription}
                  className="brutalist-button bg-primary/10 border-primary"
                >
                  <Crown className="w-4 h-4 mr-2 text-primary" />
                  Pro
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLanding(true)}
                  className="brutalist-button"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
              )}

              <div className="hidden md:flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span className="font-medium">{user?.email}</span>
              </div>
              
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/admin')}
                  className="brutalist-button"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="brutalist-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hidden Plaid Connect - Only for Pro users */}
      {isSubscribed && (
        <>
          <div style={{ display: requiresReauth ? 'block' : 'none' }}>
            <PlaidConnect 
              ref={plaidConnectRef} 
              onSuccess={handleConnectSuccess}
              requiresReauth={requiresReauth}
              existingAccessToken={plaidAccessToken}
              onReauthComplete={clearReauthFlag}
            />
          </div>
          {!requiresReauth && (
            <div style={{ display: 'none' }}>
              <PlaidConnect ref={plaidConnectRef} onSuccess={handleConnectSuccess} />
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Net Worth Display */}
        <NetWorthDisplay />

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {isSubscribed ? (
            <>
              <Button 
                onClick={handleAddAccount}
                className="brutalist-button bg-primary text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Link Bank Account
              </Button>
              
              {accounts.length > 0 && (
                <Button 
                  onClick={handleRefresh}
                  variant="outline"
                  disabled={isLoading}
                  className="brutalist-button"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Balances
                </Button>
              )}
            </>
          ) : (
            <div className="text-center">
              <UpgradePrompt 
                feature="Automated Bank Sync" 
                description="Link your bank accounts and sync balances automatically with Plaid"
              />
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Accounts */}
          <div className="lg:col-span-2 space-y-8">
            <AccountsList />
          </div>

          {/* Right Column - Chart & Goals */}
          <div className="space-y-8">
            <NetWorthChart />
            <GoalsSection />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
