import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { purchaseApi, PurchaseRequest } from '@/api/purchaseApi';
import { formatCurrency } from '@/lib/utils';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  price: number;
}

export function PurchaseModal({ isOpen, onClose, productId, productName, price }: PurchaseModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [orderDetails, setOrderDetails] = useState<{ orderNumber?: string; message?: string }>({});

  const handlePurchase = async () => {
    if (!shippingAddress.trim()) {
      alert('Please enter a shipping address');
      return;
    }

    setIsLoading(true);
    setPurchaseStatus('processing');

    try {
      const purchaseData: PurchaseRequest = {
        productId,
        quantity,
        shippingAddress,
        paymentMethod,
      };

      const response = await purchaseApi.purchaseProduct(purchaseData);
      
      setOrderDetails({
        orderNumber: response.orderNumber,
        message: response.message
      });
      
      setPurchaseStatus('success');
    } catch (error) {
      console.error('Purchase error:', error);
      setOrderDetails({
        message: error instanceof Error ? error.message : 'Failed to complete purchase'
      });
      setPurchaseStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    if (!isLoading) {
      setQuantity(1);
      setShippingAddress('');
      setPurchaseStatus('idle');
      setOrderDetails({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            {purchaseStatus === 'idle' && 'Fill in the details below to complete your purchase.'}
            {purchaseStatus === 'processing' && 'Processing your order, please wait...'}
          </DialogDescription>
        </DialogHeader>

        {purchaseStatus === 'idle' && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Input
                id="product"
                value={`${productName} - ${formatCurrency(price)}`}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Select
                value={quantity.toString()}
                onValueChange={(value) => setQuantity(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quantity" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping">Shipping Address</Label>
              <Input
                id="shipping"
                placeholder="Enter your shipping address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="card" disabled>Credit/Debit Card (Coming Soon)</SelectItem>
                  <SelectItem value="bank" disabled>Bank Transfer (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <div className="flex justify-between font-medium text-lg">
                <span>Total:</span>
                <span>{formatCurrency(price * quantity)}</span>
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handlePurchase}
                className="w-full bg-black text-white hover:bg-gray-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Purchase'
                )}
              </Button>
            </div>
          </div>
        )}

        {(purchaseStatus === 'processing' || purchaseStatus === 'success' || purchaseStatus === 'error') && (
          <div className="py-6 text-center">
            {purchaseStatus === 'processing' && (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Processing your order. Please wait...</p>
              </div>
            )}

            {purchaseStatus === 'success' && (
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <h3 className="text-lg font-medium">Order Placed Successfully!</h3>
                {orderDetails.orderNumber && (
                  <p className="text-sm text-gray-600">Order #: {orderDetails.orderNumber}</p>
                )}
                <p className="text-sm text-gray-600">{orderDetails.message || 'Thank you for your purchase!'}</p>
                <Button onClick={handleClose} className="mt-4">
                  Close
                </Button>
              </div>
            )}

            {purchaseStatus === 'error' && (
              <div className="flex flex-col items-center space-y-4">
                <XCircle className="h-12 w-12 text-red-500" />
                <h3 className="text-lg font-medium">Order Failed</h3>
                <p className="text-sm text-red-600">{orderDetails.message || 'Failed to process your order. Please try again.'}</p>
                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handlePurchase} disabled={isLoading}>
                    {isLoading ? 'Retrying...' : 'Try Again'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
