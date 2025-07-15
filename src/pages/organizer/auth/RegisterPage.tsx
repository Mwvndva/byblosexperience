import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganizerAuth } from '@/contexts/OrganizerAuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().min(10, 'Please enter a valid phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ['passwordConfirm'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, isAuthenticated, isLoading: isAuthLoading } = useOrganizerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/organizer/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  // Show loading state while checking auth status
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirm: ''
    }
  });

  const onSubmit = async (formData: RegisterFormData) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Prepare registration data
      const registrationData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        passwordConfirm: formData.passwordConfirm
      };
      
      // Call the register function from our auth context
      await registerUser(registrationData);
      
      // The actual navigation will be handled by the useEffect above
      // when isAuthenticated becomes true
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Show error toast if not already shown by the auth context
      if (error?.isAuthError !== true) {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-gray-900">Create an Organizer Account</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Fill in the form below to create your organizer account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="animate-in fade-in">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                {...register('full_name')}
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500 mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...register('phone')}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={errors.password ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill={showPassword ? "currentColor" : "none"}
                    stroke={showPassword ? "none" : "currentColor"}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.89 2.096A7 7 0 005.11 14.904a2 2 0 002.343 2.11.997.997 0 001.414-.586 1.466 1.466 0 01-.404-2.063l-.405-.81a18.665 18.665 0 01-1.134-.71 4.678 4.678 0 01-.19-.455c-.012-.115-.018-.233-.018-.35.002-.12.006-.24.018-.351a4.678 4.678 0 01-.19-.454l-.404-.81a1.466 1.466 0 01-.405-2.064.997.997 0 001.413-.587 2 2 0 002.343 2.11A7 7 0 0013.89 2.096z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      fill={showPassword ? "none" : "currentColor"}
                      stroke={showPassword ? "currentColor" : "none"}
                    />
                  </svg>
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="passwordConfirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('passwordConfirm')}
                  className={errors.passwordConfirm ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill={showConfirmPassword ? "currentColor" : "none"}
                    stroke={showConfirmPassword ? "none" : "currentColor"}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.89 2.096A7 7 0 005.11 14.904a2 2 0 002.343 2.11.997.997 0 001.414-.586 1.466 1.466 0 01-.404-2.063l-.405-.81a18.665 18.665 0 01-1.134-.71 4.678 4.678 0 01-.19-.455c-.012-.115-.018-.233-.018-.35.002-.12.006-.24.018-.351a4.678 4.678 0 01-.19-.454l-.404-.81a1.466 1.466 0 01-.405-2.064.997.997 0 001.413-.587 2 2 0 002.343 2.11A7 7 0 0013.89 2.096z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      fill={showConfirmPassword ? "none" : "currentColor"}
                      stroke={showConfirmPassword ? "currentColor" : "none"}
                    />
                  </svg>
                </button>
              </div>
              {errors.passwordConfirm && (
                <p className="text-sm text-red-500 mt-1">{errors.passwordConfirm.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            <div className="text-sm text-center">
              Already have an account?{' '}
              <Link to="/organizer/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
