import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, X, AlertCircle, RefreshCw } from 'lucide-react';
import { plaidService } from '@/services/plaidService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PlaidConnectProps {
  onSuccess?: (accessToken: string) => void;
}

declare global {
  interface Window {
    Plaid: {
      create: (config: any) => {
        open: () => void;
        destroy: () => void;
      };
    };
  }
}

export interface PlaidConnectRef {
  connect: () => void;
}

const PlaidConnect = React.forwardRef<PlaidConnectRef, PlaidConnectProps>(({ onSuccess }, ref) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isPlaidLoaded, setIsPlaidLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Expose connect method to parent
  React.useImperativeHandle(ref, () => ({
    connect: handleConnectBank
  }));

  // Check if Plaid SDK is loaded
  useEffect(() => {
    const checkPlaidLoaded = () => {
      if (window.Plaid) {
        console.log('✅ Plaid SDK loaded successfully');
        setIsPlaidLoaded(true);
      } else {
        // Keep checking until Plaid is loaded
        setTimeout(checkPlaidLoaded, 100);
      }
    };
    
    checkPlaidLoaded();
  }, []);

  const handleConnectBank = async () => {
    if (!linkToken || !isPlaidLoaded) {
      console.log('❌ Cannot connect: missing link token or Plaid not loaded');
      setError('Unable to connect: Plaid not ready or link token missing');
      return;
    }

    console.log('🚀 Starting Plaid Link flow...');
    setIsConnecting(true);
    setError(null);
    
    try {
      // Use real Plaid Link
      const linkHandler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (public_token: string, metadata: any) => {
          console.log('✅ Plaid Link success');
          
      try {
        console.log('🔄 Exchanging public token for access token...');
        const accessToken = await plaidService.exchangePublicToken(public_token, user?.id || '');
        console.log('✅ Access token received successfully');
            
            if (onSuccess) {
              onSuccess(accessToken);
            }
            
            toast({
              title: "Success!",
              description: "Bank account connected successfully via Plaid Production.",
            });
          } catch (error) {
            console.error('💥 Error exchanging token:', error);
            setError(`Failed to exchange token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            toast({
              title: "Error",
              description: "Failed to complete bank connection.",
              variant: "destructive",
            });
          }
          
          setIsConnecting(false);
        },
        onExit: (err: any, metadata: any) => {
          console.log('🚪 Plaid Link exit:', { err, metadata });
          if (err) {
            console.error('❌ Plaid Link error:', err);
            setError(`Plaid Link error: ${err.error_message || err.error_code || 'Unknown error'}`);
          }
          setIsConnecting(false);
        },
        onEvent: (eventName: string, metadata: any) => {
          console.log('📊 Plaid Link event:', { eventName, metadata });
        },
      });

      console.log('🔗 Opening Plaid Link...');
      linkHandler.open();
      
    } catch (error) {
      console.error('💥 Error creating Plaid Link:', error);
      setError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
  };

  const handleCloseConnect = () => {
    setIsConnecting(false);
    setError(null);
  };

  const retryCreateToken = async () => {
    setError(null);
    setLinkToken(null);
    await createLinkToken();
  };

  // Create link token on component mount
  const createLinkToken = async () => {
    if (user && !isCreatingToken) {
      setIsCreatingToken(true);
      try {
        console.log('🔄 Creating production link token for user:', user.id);
        setError(null);
        const token = await plaidService.createLinkToken(user.id);
        setLinkToken(token);
        console.log('✅ Link token created successfully');
      } catch (error) {
        console.error('💥 Error creating link token:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('Invalid Plaid credentials')) {
          setError('❌ Invalid Plaid Credentials: Your production API keys are not valid. Please check your PLAID_CLIENT_ID and PLAID_SECRET_KEY in the environment variables.');
        } else {
          setError(`Failed to initialize Plaid: ${errorMessage}`);
        }
      } finally {
        setIsCreatingToken(false);
      }
    }
  };

  useEffect(() => {
    createLinkToken();
  }, [user]);

  const canConnect = linkToken && isPlaidLoaded && !error && !isCreatingToken;
  const isCredentialError = error && error.includes('Invalid Plaid credentials');

  return (
    <>
      <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Connect Your Bank Account</CardTitle>
          <CardDescription>
            Securely connect your bank account using Plaid to automatically import transactions and get personalized insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-red-800">
                    {isCredentialError ? 'Configuration Error' : 'Connection Error'}
                  </p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                  {isCredentialError && (
                    <p className="text-xs text-red-500 mt-2">
                      Please verify your production Plaid credentials are correct and active.
                    </p>
                  )}
                </div>
              </div>
              {!isCredentialError && (
                <Button
                  onClick={retryCreateToken}
                  variant="outline"
                  size="sm"
                  className="mt-3 text-red-600 border-red-300 hover:bg-red-50"
                  disabled={isCreatingToken}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
            </div>
          )}
          
          <Button 
            onClick={handleConnectBank}
            disabled={isConnecting || !canConnect || isCreatingToken}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            {isConnecting ? 'Connecting...' : isCreatingToken ? 'Initializing...' : 'Connect Bank Account'}
          </Button>
          
          <p className="text-sm text-gray-500 mt-2">
            {isCreatingToken
              ? 'Setting up Plaid connection...'
              : !isPlaidLoaded 
                ? 'Loading Plaid SDK...'
                : error
                  ? isCredentialError
                    ? 'Please check your Plaid API configuration'
                    : 'Please try again or contact support'
                  : isConnecting 
                    ? 'Connecting via Plaid Production...' 
                    : 'Powered by Plaid - Production API'
            }
          </p>
        </CardContent>
      </Card>

      {isConnecting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader className="text-center">
              <CardTitle>Connecting via Plaid</CardTitle>
              <CardDescription>
                Please complete the connection in the Plaid Link window...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <Button
                onClick={handleCloseConnect}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
});

PlaidConnect.displayName = 'PlaidConnect';

export default PlaidConnect;
