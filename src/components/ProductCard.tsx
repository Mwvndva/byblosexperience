import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Phone, Image as ImageIcon, Mail, X, MapPin, Globe } from 'lucide-react';
import { Product, Seller } from '@/types';
import { cn, formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ProductCardProps {
  product: Product;
  seller?: Seller;
}

export function ProductCard({ product, seller }: ProductCardProps) {
  const [isSellerDialogOpen, setIsSellerDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  
  // Use seller from product if not provided as prop
  const displaySeller = seller || product.seller;
  const displaySellerName = displaySeller?.fullName || 'Unknown Seller';
  const hasContactInfo = Boolean(displaySeller?.phone || displaySeller?.email);
  const sellerLocation = displaySeller?.location;
  const isSold = product.status === 'sold' || product.isSold;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSIvPjwvc3ZnPg=';
    target.alt = 'Image not available';
    target.className = 'w-full h-64 object-contain bg-gray-50 p-4';
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.image_url) {
      setIsImageDialogOpen(true);
    }
  };

  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg ${isSold ? 'opacity-80 hover:opacity-80 border-2 border-red-500 bg-red-50' : 'hover:shadow-xl'}`}>
      {/* SOLD Badge */}
      {isSold && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
            SOLD
          </div>
        </div>
      )}
      
      {/* Product Image */}
      <div className="relative">
        {product.image_url ? (
          <div className="relative">
            <button 
              onClick={handleImageClick}
              className="w-full h-64 overflow-hidden focus:outline-none relative"
              aria-label={isSold ? 'View larger image (Sold)' : 'View larger image'}
              disabled={isSold}
            >
              <img
                src={product.image_url}
                alt={product.name}
                className={cn(
                  'w-full h-full object-cover transition-all duration-300',
                  isSold ? 'opacity-60 grayscale' : 'group-hover:scale-105',
                  !isSold && 'cursor-zoom-in'
                )}
                onError={handleImageError}
              />
            </button>
            
            {isSold && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-red-600/90 text-white text-sm font-bold px-4 py-2 rounded-full transform rotate-[-5deg] shadow-lg">
                  SOLD
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-gray-50 relative">
            <ImageIcon className={cn("h-16 w-16", isSold ? 'text-gray-400' : 'text-gray-300')} />
            {isSold && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                  SOLD
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      
      {/* Product Details */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 line-clamp-2 h-12">
              {product.name}
            </h3>
            <p className="text-sm text-gray-500">By {displaySellerName}</p>
            {sellerLocation && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <MapPin className="h-3 w-3" />
                <span>{sellerLocation}</span>
              </div>
            )}
            {product.description && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(product.price)}
            </p>
            {isSold && (
              <p className="text-xs text-red-600 font-medium">
                {product.soldAt ? `Sold on ${new Date(product.soldAt).toLocaleDateString()}` : 'Sold'}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Dialog open={isSellerDialogOpen} onOpenChange={setIsSellerDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasContactInfo) {
                    e.preventDefault();
                  }
                }}
                disabled={!hasContactInfo}
              >
                <User className="h-4 w-4" />
                <span>Contact</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contact Seller</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">{displaySellerName}</span>
                </div>
                {displaySeller?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <a
                      href={`tel:${displaySeller.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {displaySeller.phone}
                    </a>
                  </div>
                )}
                {displaySeller?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <a
                      href={`mailto:${displaySeller.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {displaySeller.email}
                    </a>
                  </div>
                )}
                {displaySeller?.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-gray-500" />
                    <a
                      href={displaySeller.website.startsWith('http') ? displaySeller.website : `https://${displaySeller.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {displaySeller.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <div className="relative w-full h-full">
            <button
              onClick={() => setIsImageDialogOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
              aria-label="Close preview"
            >
              <X className="h-5 w-5 text-gray-900" />
            </button>
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain max-h-[80vh]"
              onError={handleImageError}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
