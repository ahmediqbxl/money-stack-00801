import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, X } from 'lucide-react';

interface FlinksConnectProps {
  onSuccess?: (loginId: string) => void;
}

const FlinksConnect = ({ onSuccess }: FlinksConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectBank = () => {
    setIsConnecting(true);
    
    // For demo purposes, simulate a successful connection
    setTimeout(() => {
      const mockLoginId = `scotiabank_${Date.now()}`;
      console.log('Mock Flinks connection successful, loginId:', mockLoginId);
      
      if (onSuccess) {
        onSuccess(mockLoginId);
      }
      
      setIsConnecting(false);
    }, 2000);
  };

  const handleCloseConnect = () => {
    setIsConnecting(false);
  };

  useEffect(() => {
    // Listen for messages from Flinks iframe (for real implementation)
    const handleFlinksMessage = (event: MessageEvent) => {
      console.log('Flinks Connect Event:', event.data);
      
      if (event.data.type === 'close') {
        handleCloseConnect();
      }
      
      if (event.data.type === 'success') {
        console.log('Bank connected successfully:', event.data);
        
        const loginId = event.data.loginId || event.data.data?.loginId;
        if (loginId && onSuccess) {
          onSuccess(loginId);
        }
        
        handleCloseConnect();
      }
    };

    window.addEventListener('message', handleFlinksMessage);
    
    return () => {
      window.removeEventListener('message', handleFlinksMessage);
    };
  }, [onSuccess]);

  return (
    <>
      <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Connect Your Bank Account</CardTitle>
          <CardDescription>
            Securely connect your Canadian bank account to automatically import transactions and get personalized insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={handleConnectBank}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            {isConnecting ? 'Connecting...' : 'Connect Bank Account'}
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            {isConnecting ? 'Connecting to Scotiabank...' : 'Powered by Flinks - Bank-level security for Canadian financial institutions'}
          </p>
        </CardContent>
      </Card>

      {isConnecting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader className="text-center">
              <CardTitle>Connecting to Scotiabank</CardTitle>
              <CardDescription>Please wait while we establish a secure connection...</CardDescription>
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
};

export default FlinksConnect;
