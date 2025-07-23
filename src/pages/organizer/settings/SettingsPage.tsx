import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganizerAuth } from '@/hooks/use-organizer-auth';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Form schemas
const profileFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SettingsPage() {
  const { organizer } = useOrganizerAuth();

  // Initialize profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: organizer?.full_name || '',
      email: organizer?.email || '',
      phone: organizer?.phone || '',
    },
  });

  // Set initial form values when organizer data is available
  useEffect(() => {
    if (organizer) {
      profileForm.reset({
        full_name: organizer.full_name || '',
        email: organizer.email || '',
        phone: organizer.phone || '',
      });
    }
  }, [organizer]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium">Profile Information</h2>
        <p className="text-sm text-gray-500">Your account's profile information.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <div className="text-sm py-2 px-3 border rounded-md bg-black text-white">
              {profileForm.getValues('full_name') || 'Not provided'}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <div className="text-sm py-2 px-3 border rounded-md bg-black text-white">
              {profileForm.getValues('email') || 'Not provided'}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="text-sm py-2 px-3 border rounded-md bg-black text-white">
              {profileForm.getValues('phone') || 'Not provided'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-6 pt-6 border-t border-gray-700">
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-yellow-300">Danger Zone</h3>
          <p className="text-sm text-gray-400">These actions are irreversible. Proceed with caution.</p>
          
          <div className="flex items-center justify-between rounded-md border border-yellow-300/20 p-4 mt-4">
            <div>
              <h4 className="font-medium text-white">Delete Account</h4>
              <p className="text-sm text-gray-400">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
