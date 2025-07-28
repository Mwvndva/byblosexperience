import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const AdminLoginPage = () => {
  console.log('Rendering AdminLoginPage');
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');
  const auth = useAdminAuth();
  const { login, error: authError, loading } = auth;
  const navigate = useNavigate();

  console.log('Auth context:', { 
    isAuthenticated: auth.isAuthenticated, 
    loading: auth.loading, 
    error: auth.error 
  });

  // Clear error when component mounts
  useEffect(() => {
    console.log('AdminLoginPage mounted');
    setLocalError('');
  }, []);

  // Update local error when auth error changes
  useEffect(() => {
    console.log('Auth error changed:', authError);
    if (authError) {
      setLocalError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    if (!pin) {
      setLocalError('Please enter a PIN');
      return;
    }
    
    await login(pin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Enter your admin PIN to access the dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {localError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                {localError}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-medium">
                Admin PIN
              </label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter admin PIN"
                required
                className="w-full"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
