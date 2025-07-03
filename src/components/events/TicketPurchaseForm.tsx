import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Minus, Plus, CheckCircle2 } from 'lucide-react';
import type { TicketType as BaseTicketType } from '@/types/event';
import { purchaseTicketsWithPaystack } from '@/api/eventApi';

// Extend the Window interface to include PaystackPop
declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface EventTicketType extends Omit<BaseTicketType, 'max_per_order'> {
  max_per_order?: number;
  min_per_order?: number;
  sold?: number;
  available?: number;
  is_sold_out?: boolean;
  // quantity_available is already included from BaseTicketType
}

interface PurchaseFormData {
  name: string;
  email: string;
  phone: string;
  ticketTypeId: number;
  quantity: number;
}

interface TicketPurchaseFormProps {
  event: {
    id: number;
    name: string;
    ticketTypes?: EventTicketType[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: PurchaseFormData) => Promise<void>;
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Paystack public key - ensure this is set in your .env.local file
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_eaad3ee44b9df9657389eaf026dbf15daf1f8cc5';

export function TicketPurchaseForm({ 
  event, 
  open, 
  onOpenChange,
}: TicketPurchaseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    phoneNumber: '',
    ticketTypeId: '',
    quantity: 1
  });
  
  const ticketTypes = event.ticketTypes || [];
  const selectedTicket = ticketTypes?.find(t => t.id.toString() === formData.ticketTypeId) as EventTicketType | undefined;
  const totalPrice = selectedTicket ? selectedTicket.price * formData.quantity : 0;

  const [showPaystack, setShowPaystack] = useState(false);
  const [paystackConfig, setPaystackConfig] = useState<any>(null);
  const paystackButtonRef = useRef<HTMLDivElement>(null);
  const [isPaystackReady, setIsPaystackReady] = useState(false);

  // Preload Paystack script when component mounts
  useEffect(() => {
    if (!document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => setIsPaystackReady(true);
      document.body.appendChild(script);
    } else {
      setIsPaystackReady(true);
    }
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        customerName: '',
        customerEmail: '',
        phoneNumber: '',
        ticketTypeId: ticketTypes.length === 1 ? String(ticketTypes[0].id) : '',
        quantity: 1
      });
      setPurchaseComplete(false);
      setShowPaystack(false);
    }
  }, [open, ticketTypes]);

  // Handle Paystack button rendering
  useEffect(() => {
    if (showPaystack && paystackConfig && paystackButtonRef.current && isPaystackReady) {
      // Clear any existing buttons
      paystackButtonRef.current.innerHTML = '';
      
      // Create new Paystack button
      const button = document.createElement('button');
      button.className = 'paystack-button';
      button.textContent = `Pay KES ${(paystackConfig.amount / 100).toLocaleString()}`;
      button.onclick = (e) => {
        e.preventDefault();
        
        // Close the form first
        onOpenChange(false);
        
        // Store callbacks before they get lost in the config spread
        const { onSuccess, onClose, ...config } = paystackConfig;
        
        if (typeof (window as any).PaystackPop !== 'undefined') {
          const handler = (window as any).PaystackPop.setup({
            ...config,
            key: config.publicKey,
            ref: 'ticket-purchase-' + Date.now(),
            callback: (response: any) => {
              if (onSuccess) onSuccess(response);
            },
            onClose: () => {
              if (onClose) onClose();
            },
          });
          handler.openIframe();
        } else {
          console.error('Paystack script not loaded');
          toast({
            title: 'Payment Error',
            description: 'Unable to load payment processor. Please try again.',
            variant: 'destructive',
          });
          // Reopen the form if Paystack fails to load
          onOpenChange(true);
        }
      };
      
      paystackButtonRef.current.appendChild(button);
    }
  }, [showPaystack, paystackConfig, isPaystackReady]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number = value;
    
    if (type === 'number') {
      processedValue = Number(value);
    } else if (name === 'phoneNumber') {
      processedValue = value.replace(/[^\d]/g, '');
    } else if (name === 'customerEmail') {
      processedValue = value.toLowerCase().trim();
    } else if (name === 'customerName') {
      processedValue = value.replace(/[^a-zA-Z\s'-]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const getMaxQuantity = (ticket: EventTicketType | undefined): number => {
    if (!ticket) return 10;
    // Use the available field if it exists, otherwise fall back to quantity_available or 0
    const available = ticket.available !== undefined 
      ? ticket.available 
      : (ticket.quantity_available || 0);
    const maxPerOrder = ticket.max_per_order || 10;
    return Math.max(0, Math.min(available, maxPerOrder, 10));
  };
  
  const maxQuantity = getMaxQuantity(selectedTicket);

  const handleQuantityChange = (newQuantity: number) => {
    const minQuantity = selectedTicket?.min_per_order || 1;
    const validQuantity = Math.max(minQuantity, Math.min(maxQuantity, newQuantity));
    setFormData(prev => ({ ...prev, quantity: validQuantity }));
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!formData.ticketTypeId) {
      errors.push('Please select a ticket type');
    } else if (maxQuantity <= 0) {
      errors.push('The selected ticket type is sold out');
    }
    
    if (!formData.customerName) {
      errors.push('Please enter your name');
    } else if (formData.customerName.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!formData.customerEmail) {
      errors.push('Please enter your email address');
    } else if (!isValidEmail(formData.customerEmail)) {
      errors.push('Please enter a valid email address');
    }
    
    if (!formData.phoneNumber) {
      errors.push('Please enter your phone number');
    } else if (!/^[17]\d{8}$/.test(formData.phoneNumber)) {
      errors.push('Please enter a valid Kenyan phone number (starts with 1 or 7, 9 digits)');
    }
    
    if (isNaN(formData.quantity) || formData.quantity < 1) {
      errors.push('Quantity must be at least 1');
    } else if (selectedTicket) {
      if (formData.quantity > maxQuantity) {
        errors.push(`Only ${maxQuantity} ticket${maxQuantity !== 1 ? 's' : ''} available`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const preparePaystackPayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if selected ticket is sold out
    if (maxQuantity <= 0) {
      toast({ 
        title: 'Ticket Unavailable', 
        description: 'The selected ticket type is sold out. Please select another ticket type.', 
        variant: 'destructive' 
      });
      return;
    }

    const { isValid, errors } = validateForm();
    if (!isValid) {
      toast({ 
        title: 'Please fix the following issues:', 
        description: errors.join('\n'), 
        variant: 'destructive' 
      });
      return;
    }
    
    const purchaseData = {
      eventId: event.id,
      ticketTypeId: formData.ticketTypeId ? Number(formData.ticketTypeId) : null,
      quantity: Number(formData.quantity),
      customerName: formData.customerName.trim(),
      customerEmail: formData.customerEmail.trim().toLowerCase(),
      phoneNumber: `+254${formData.phoneNumber}`
    };

    setPaystackConfig({
      email: purchaseData.customerEmail,
      amount: Math.round(totalPrice * 100), // Convert to kobo (100 kobo = 1 KES)
      currency: 'KES',
      publicKey: PAYSTACK_PUBLIC_KEY,
      text: `Pay KES ${totalPrice.toLocaleString()}`,
      metadata: {
        custom_fields: [
          {
            display_name: 'Event',
            variable_name: 'event',
            value: event.name
          },
          {
            display_name: 'Ticket Type',
            variable_name: 'ticket_type',
            value: selectedTicket?.name || 'General Admission'
          },
          {
            display_name: 'Quantity',
            variable_name: 'quantity',
            value: purchaseData.quantity.toString()
          }
        ]
      },
      onSuccess: async (response: any) => {
        try {
          setIsSubmitting(true);
          await purchaseTicketsWithPaystack({ 
            ...purchaseData, 
            reference: response.reference 
          });
          setPurchaseComplete(true);
          
          // Show success popup toast
          toast({
            title: '🎉 Payment Successful!',
            description: (
              <div className="space-y-2">
                <p>Your tickets have been booked successfully.</p>
                <p className="font-medium">A confirmation email has been sent to {purchaseData.customerEmail}.</p>
                <p className="text-sm text-muted-foreground">Please check your inbox (and spam folder) for your e-tickets.</p>
              </div>
            ),
            variant: 'default',
            duration: 10000, // Show for 10 seconds
            className: 'bg-green-50 border-green-200',
          });
        } catch (error: any) {
          console.error('Payment error:', error);
          toast({ 
            title: 'Payment Failed', 
            description: error.message || 'Failed to process payment. Please try again.', 
            variant: 'destructive' 
          });
        } finally {
          setIsSubmitting(false);
        }
      },
      onClose: () => {
        setShowPaystack(false);
        onOpenChange(false); // Close the form when Paystack modal is closed
      }
    });
    
    setShowPaystack(true);
  };

  if (purchaseComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Purchase Complete!</h3>
            <p className="text-sm text-gray-500 mt-2">
              Your tickets have been booked successfully. You will receive a confirmation email shortly.
            </p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Purchase Tickets</DialogTitle>
          <DialogDescription>
            Complete your ticket purchase for {event.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={preparePaystackPayment} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Full Name</Label>
            <Input
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder="John Doe"
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              value={formData.customerEmail}
              onChange={handleInputChange}
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number (Kenyan)</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm">
                +254
              </span>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="712345678"
                className="rounded-l-none"
                required
                pattern="[17]\d{8}"
                title="Enter a valid Kenyan phone number starting with 7 or 1 (9 digits)"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your 9-digit Kenyan number (starts with 7 or 1)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Ticket Type</Label>
            <Select
              value={formData.ticketTypeId}
              onValueChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  ticketTypeId: value,
                  quantity: 1
                }));
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a ticket type" />
              </SelectTrigger>
              <SelectContent>
                <div className="space-y-1">
                  {ticketTypes.map((ticket) => {
                    const isSoldOut = ticket.is_sold_out || ticket.available === 0;
                    return (
                      <SelectItem 
                        key={ticket.id} 
                        value={String(ticket.id)}
                        className={`${isSoldOut ? 'opacity-70' : 'hover:bg-gray-50'}`}
                        disabled={isSoldOut}
                      >
                        <div className="flex justify-between w-full items-center">
                          <div className="flex items-center">
                            <span className={`font-medium ${isSoldOut ? 'text-muted-foreground' : ''}`}>
                              {ticket.name}
                            </span>
                            {isSoldOut && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Sold Out
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`font-medium ${isSoldOut ? 'line-through text-muted-foreground' : ''}`}>
                              {formatPrice(ticket.price)}
                            </span>
                            {ticket.available !== undefined && !isSoldOut && (
                              <span className="text-xs text-green-600">
                                {ticket.available} {ticket.available === 1 ? 'ticket' : 'tickets'} left
                              </span>
                            )}
                            {isSoldOut && ticket.available === 0 && (
                              <span className="text-xs text-muted-foreground">
                                Sold out
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
              </SelectContent>
            </Select>
          </div>
          
          {formData.ticketTypeId && (
            <div className="space-y-2">
              {maxQuantity <= 0 && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  This ticket type is currently sold out. Please check back later or select a different ticket type.
                </div>
              )}
              <Label>Quantity</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(formData.quantity - 1)}
                  disabled={formData.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={maxQuantity}
                  value={formData.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="text-center w-16"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(formData.quantity + 1)}
                  disabled={formData.quantity >= maxQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Max {maxQuantity} per order
              </p>
              
              <div className="pt-4 border-t mt-4">
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-4">
            <div className="w-full space-y-2">
              <Button 
                type="submit" 
                className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                disabled={isSubmitting || !formData.ticketTypeId || maxQuantity <= 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : maxQuantity <= 0 ? (
                  'Sold Out'
                ) : (
                  'Validate'
                )}
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              <div ref={paystackButtonRef} className="mt-2">
                {/* Paystack button will be injected here */}
              </div>
              <style>
                {`
                  .paystack-button {
                    width: 100%;
                    background-color: #00A859 !important;
                    color: white !important;
                    border: none !important;
                    padding: 0.75rem 1.5rem !important;
                    border-radius: 0.375rem !important;
                    font-size: 1rem !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 0.5rem !important;
                  }
                  .paystack-button:hover {
                    background-color: #008e4d !important;
                  }
                  .paystack-button:disabled {
                    opacity: 0.7 !important;
                    cursor: not-allowed !important;
                  }
                `}
              </style>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
