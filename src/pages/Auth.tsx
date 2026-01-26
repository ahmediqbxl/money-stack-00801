import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { storeEncryptionPassword } from '@/lib/encryption';
import { Wallet, TrendingUp, Shield, PiggyBank, AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// IMPORTANT: Zero-knowledge encryption warning
const ENCRYPTION_WARNING = "Your password is used to encrypt your financial data. If you forget your password, your data CANNOT be recovered.";

const signInSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        toast({
          title: "Google Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      const validatedData = signInSchema.parse({ email, password });
      const { error } = await signIn(validatedData.email, validatedData.password);

      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        storeEncryptionPassword(validatedData.password);
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        navigate('/');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const fullName = formData.get('fullName') as string;
      const isTestUser = formData.get('isTestUser') === 'on';

      const validatedData = signUpSchema.parse({ fullName, email, password });
      const { error } = await signUp(validatedData.email, validatedData.password, validatedData.fullName, isTestUser);

      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        storeEncryptionPassword(validatedData.password);
        toast({
          title: "Account Created!",
          description: "Welcome to MoneyStack! Your data will be encrypted with your password.",
        });
        navigate('/');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-primary flex items-center justify-center border-4 border-background">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-3xl font-black tracking-tight">MONEYSTACK</span>
          </div>
          
          <h1 className="text-5xl font-display font-black leading-tight mb-6">
            Know Your<br />
            <span className="text-primary">Net Worth.</span><br />
            Reach Your Goals.
          </h1>
          
          <p className="text-xl text-background/70 max-w-md">
            Track every asset and liability in one place. See the full picture of your financial health.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 flex items-center justify-center border-2 border-background">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Track Net Worth</h3>
              <p className="text-background/60 text-sm">Automatic balance syncing with Plaid</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-500 flex items-center justify-center border-2 border-background">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Zero-Knowledge Encryption</h3>
              <p className="text-background/60 text-sm">Only you can see your data</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 flex items-center justify-center border-2 border-background">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Set Financial Goals</h3>
              <p className="text-background/60 text-sm">Track progress towards milestones</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary flex items-center justify-center border-2 border-foreground">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-black tracking-tight">MONEYSTACK</span>
          </div>

          <Card className="border-4 border-foreground shadow-brutalist">
            <CardContent className="p-8">
              {!showEmailForm ? (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-display font-black mb-2">
                      {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-muted-foreground">
                      {isSignUp ? 'Start tracking your net worth today' : 'Sign in to your account'}
                    </p>
                  </div>

                  {/* Google Sign In - Primary */}
                  <Button
                    type="button"
                    className="w-full h-14 text-lg font-bold border-2 border-foreground shadow-brutalist hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all bg-white text-foreground hover:bg-gray-50"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                  >
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-foreground/20" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-4 text-muted-foreground font-bold">
                        or
                      </span>
                    </div>
                  </div>

                  {/* Email option - Secondary */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 font-bold border-2 border-foreground"
                    onClick={() => setShowEmailForm(true)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Continue with Email
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      className="font-bold text-primary hover:underline"
                      onClick={() => setIsSignUp(!isSignUp)}
                    >
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <button
                    type="button"
                    className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => setShowEmailForm(false)}
                  >
                    ← Back to options
                  </button>

                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-display font-black mb-2">
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {isSignUp ? 'Enter your details below' : 'Enter your credentials'}
                    </p>
                  </div>

                  {isSignUp ? (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="font-bold">Full Name</Label>
                        <Input
                          id="signup-name"
                          name="fullName"
                          type="text"
                          placeholder="John Doe"
                          required
                          className="h-12 border-2 border-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="font-bold">Email</Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          required
                          className="h-12 border-2 border-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="font-bold">Password</Label>
                        <Input
                          id="signup-password"
                          name="password"
                          type="password"
                          placeholder="Min 8 chars, uppercase, number"
                          required
                          minLength={8}
                          className="h-12 border-2 border-foreground"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox id="isTestUser" name="isTestUser" />
                        <Label htmlFor="isTestUser" className="text-sm cursor-pointer">
                          Use Plaid Sandbox (test data)
                        </Label>
                      </div>
                      
                      <div className="p-3 bg-amber-50 border-2 border-amber-300">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-800">
                            <strong>Important:</strong> {ENCRYPTION_WARNING}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        type="submit"
                        className="w-full h-12 font-bold border-2 border-foreground shadow-brutalist hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                        disabled={isLoading}
                      >
                        {isLoading ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="font-bold">Email</Label>
                        <Input
                          id="signin-email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          required
                          className="h-12 border-2 border-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="font-bold">Password</Label>
                        <Input
                          id="signin-password"
                          name="password"
                          type="password"
                          required
                          className="h-12 border-2 border-foreground"
                        />
                      </div>
                      
                      <Button
                        type="submit"
                        className="w-full h-12 font-bold border-2 border-foreground shadow-brutalist hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  )}

                  <p className="text-center text-sm text-muted-foreground">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      className="font-bold text-primary hover:underline"
                      onClick={() => setIsSignUp(!isSignUp)}
                    >
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
