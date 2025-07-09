import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { useOrganizerAuth } from '@/contexts/OrganizerAuthContext';

type PayoutMethod = 'mpesa' | 'bank';

export function PayoutRequestDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>('mpesa');
  const [formData, setFormData] = useState({
    name: '',
    mpesaNumber: '',
    registeredName: '',
    bankName: '',
    accountNumber: ''
  });
  
  const { toast } = useToast();
  const { organizer } = useOrganizerAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizer) {
      toast({
        title: 'Error',
        description: 'Please log in to request a payout.',
        variant: 'destructive',
      });
      return;
    }

    // Basic validation
    if (method === 'mpesa' && (!formData.mpesaNumber || !formData.registeredName)) {
      toast({
        title: 'Error',
        description: 'Please fill in all required M-Pesa details.',
        variant: 'destructive',
      });
      return;
    }

    if (method === 'bank' && (!formData.bankName || !formData.accountNumber)) {
      toast({
        title: 'Error',
        description: 'Please fill in all required bank details.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        name: formData.name || organizer.full_name, // full_name is the correct property from the Organizer type
        method,
        ...(method === 'mpesa' 
          ? { 
              mpesaNumber: formData.mpesaNumber,
              registeredName: formData.registeredName 
            } 
          : {
              bankName: formData.bankName,
              accountNumber: formData.accountNumber
            })
      };

      // Make API call to request payout
      await api.post('/organizers/request-payout', payload);
      
      toast({
        title: 'Request Submitted',
        description: 'Your payout request has been received. Please allow up to 3 business days for processing.',
      });
      
      // Reset form and close dialog
      setFormData({
        name: '',
        mpesaNumber: '',
        registeredName: '',
        bankName: '',
        accountNumber: ''
      });
      setOpen(false);
      
    } catch (error) {
      console.error('Error submitting payout request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit payout request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200">
          <Wallet className="h-4 w-4 mr-2" />
          Request Payout
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Please double-check all payment details before submitting. Incorrect information may delay your payout.
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label>Your Name</Label>
            <Input 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={organizer?.full_name || 'Your full name'}
              defaultValue={organizer?.full_name || ''}
            />
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payout Method</Label>
              <RadioGroup 
                value={method} 
                onValueChange={(value) => setMethod(value as PayoutMethod)}
                className="grid grid-cols-2 gap-4 mt-2"
              >
                <div>
                  <RadioGroupItem value="mpesa" id="mpesa" className="peer sr-only" />
                  <Label
                    htmlFor="mpesa"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <div className="text-sm font-medium">M-Pesa</div>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                  <Label
                    htmlFor="bank"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <div className="text-sm font-medium">Bank Transfer</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {method === 'mpesa' ? (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="mpesaNumber">M-Pesa Number</Label>
                  <Input
                    id="mpesaNumber"
                    name="mpesaNumber"
                    type="tel"
                    placeholder="e.g., 0712345678"
                    value={formData.mpesaNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registeredName">Registered Name on M-Pesa</Label>
                  <Input
                    id="registeredName"
                    name="registeredName"
                    placeholder="Name as registered with M-Pesa"
                    value={formData.registeredName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    placeholder="e.g., KCB, Equity, etc."
                    value={formData.bankName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    placeholder="Your bank account number"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
