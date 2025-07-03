
import { useEffect, useState, useCallback } from 'react';
import { ProductCard } from './ProductCard';
import { Aesthetic, Product as ProductType, Seller } from '@/types';
import { publicApiService } from '@/api/publicApi';

type AestheticWithNone = Aesthetic | '';

interface Product extends Omit<ProductType, 'seller'> {
  sellerId: string;
  seller?: Seller;
  aesthetic: Aesthetic;
}

interface ProductGridProps {
  selectedAesthetic: AestheticWithNone;
}

const ProductGrid = ({ selectedAesthetic }: ProductGridProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  interface SellerInfo {
    name: string;
    phone?: string;
  }
  
  const [sellers, setSellers] = useState<Record<string, Seller>>({});
  
  // Transform product data to ensure it matches our Product interface
  const transformProduct = (product: any): Product => {
    if (!product.image_url && !product.imageUrl) {
      console.error('Product is missing required image URL:', product);
      throw new Error('Product is missing required image');
    }
    
    return {
      id: String(product.id || ''),
      name: String(product.name || 'Unnamed Product'),
      description: String(product.description || ''),
      price: Number(product.price) || 0,
      image_url: product.image_url || product.imageUrl,
      sellerId: String(product.sellerId || product.seller_id || ''),
      isSold: Boolean(product.isSold || product.status === 'sold'),
      status: product.status || (product.isSold ? 'sold' : 'available'),
      soldAt: product.soldAt || product.sold_at || null,
      createdAt: product.createdAt || product.created_at || new Date().toISOString(),
      updatedAt: product.updatedAt || product.updated_at || new Date().toISOString(),
      aesthetic: (product.aesthetic || 'noir') as Aesthetic,
      seller: product.seller ? {
        id: String(product.seller.id || ''),
        fullName: product.seller.fullName || product.seller.full_name || 'Unknown Seller',
        email: product.seller.email || '',
        phone: product.seller.phone || '',
        createdAt: product.seller.createdAt || product.seller.created_at || new Date().toISOString(),
        updatedAt: product.seller.updatedAt || product.seller.updated_at,
        ...(product.seller.bio && { bio: product.seller.bio }),
        ...(product.seller.avatarUrl && { avatarUrl: product.seller.avatarUrl }),
        ...(product.seller.location && { location: product.seller.location }),
        ...(product.seller.website && { website: product.seller.website }),
        ...(product.seller.socialMedia && { socialMedia: product.seller.socialMedia })
      } : undefined
    };
  };

  const fetchProducts = useCallback(async () => {
    console.log('fetchProducts called with selectedAesthetic:', selectedAesthetic);
    
    if (!selectedAesthetic) {
      console.log('No aesthetic selected, clearing products');
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Fetch products using the public API service
      console.log('Fetching products for aesthetic:', selectedAesthetic);
      const fetchedProducts = await publicApiService.getProducts(
        selectedAesthetic === 'all' ? undefined : selectedAesthetic
      );
      
      console.log('Fetched products:', {
        count: fetchedProducts.length,
        firstProduct: fetchedProducts[0] ? {
          id: fetchedProducts[0].id,
          name: fetchedProducts[0].name,
          aesthetic: fetchedProducts[0].aesthetic
        } : 'No products'
      });
      
      // Transform and set products
      const transformedProducts = fetchedProducts.map(transformProduct);
      console.log('Transformed products:', transformedProducts);
      setProducts(transformedProducts);

      // Fetch seller info for each unique seller
      const uniqueSellerIds = [...new Set(transformedProducts
        .map(p => p.sellerId)
        .filter((id): id is string => !!id)
      )];
      
      if (uniqueSellerIds.length > 0) {
        const sellerPromises = uniqueSellerIds.map(async (id) => {
          try {
            const seller = await publicApiService.getSellerInfo(id);
            return seller ? { id, ...seller } : null;
          } catch (error) {
            console.error(`Failed to fetch seller ${id}:`, error);
            return null;
          }
        });

        const sellerResults = await Promise.all(sellerPromises);
        const sellerMap = sellerResults.reduce<Record<string, Seller>>((acc, seller) => {
          if (!seller) return acc;
          
          return {
            ...acc,
            [seller.id]: {
              id: seller.id,
              fullName: seller.fullName || `Seller ${seller.id.slice(0, 6)}`,
              email: seller.email || '',
              phone: seller.phone || '',
              createdAt: seller.createdAt || new Date().toISOString(),
              updatedAt: seller.updatedAt || new Date().toISOString()
            }
          };
        }, {});
        
        setSellers(sellerMap);
      } else {
        setSellers({});
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please try again later.');
      setProducts([]);
      setSellers({});
    } finally {
      setLoading(false);
    }
  }, [selectedAesthetic]);

  // Fetch products when selectedAesthetic changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts().catch(err => {
        console.error('Error in fetchProducts:', err);
        setError('Failed to load products. Please try again later.');
        setProducts([]);
        setSellers({});
        setLoading(false);
      });
    }, 100);

    // Cleanup function to cancel the fetch if the component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [fetchProducts]);

  const filteredProducts = !selectedAesthetic 
    ? [] 
    : selectedAesthetic === 'all' 
      ? products 
      : products.filter(product => product.aesthetic === selectedAesthetic);
    
  // Function to handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    console.error('Error loading image:', target.src.substring(0, 100));
    
    // Set a placeholder image
    target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2QwZDBkMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSIvPjwvc3ZnPg=';
    target.alt = 'Image not available';
    target.className = 'w-full h-64 object-contain bg-gray-50 p-4';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Show a message when no aesthetic is selected
  if (!selectedAesthetic) {
    return (
      <div className="text-center py-16 px-4">
        <h3 className="text-2xl font-serif font-bold text-gray-800 mb-4">
          Browse Our Collections
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Please select an aesthetic from above to view the available products.
        </p>
      </div>
    );
  }
  
  // Show a message when no products are found for the selected aesthetic
  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <h3 className="text-2xl font-serif font-bold text-gray-800 mb-4">
          No Products Found
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We couldn't find any products matching the selected aesthetic. Please try a different one.
        </p>
      </div>
    );
  }

  // Group products by aesthetic
  const productsByAesthetic = products.reduce<Record<string, Product[]>>((acc, product) => {
    const aesthetic = product.aesthetic || 'uncategorized';
    if (!acc[aesthetic]) {
      acc[aesthetic] = [];
    }
    acc[aesthetic].push(product);
    return acc;
  }, {});

  // Get sorted list of aesthetics with product counts
  const aesthetics = Object.entries(productsByAesthetic)
    .map(([aesthetic, products]) => ({
      id: aesthetic,
      name: aesthetic.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      count: products.length
    }))
    .sort((a, b) => b.count - a.count); // Sort by product count

  // If a specific aesthetic is selected, only show that section
  if (selectedAesthetic !== 'all') {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="font-serif text-3xl font-bold text-noir mb-2 capitalize">
              {selectedAesthetic.replace(/-/g, ' ')} Collection
            </h2>
            <p className="text-gray-600">
              {filteredProducts.length} curated pieces available
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const productSeller = product.seller || sellers[product.sellerId];
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  seller={productSeller}
                />
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // Show all categories with their products
  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-4xl font-bold text-noir mb-4">
            Shop by Aesthetic
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse our curated collections, each with its own unique style and personality.
          </p>
        </div>

        {aesthetics.map(({ id, name, count }) => (
          <section key={id} className="mb-16" id={`aesthetic-${id}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-2xl font-bold text-noir capitalize">
                {name} <span className="text-gray-400 text-lg">({count})</span>
              </h3>
              <a 
                href={`#${id}`} 
                className="text-sm font-medium text-noir hover:underline flex items-center"
              >
                View all
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {productsByAesthetic[id].slice(0, 4).map((product) => {
                const productSeller = product.seller || sellers[product.sellerId];
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    seller={productSeller}
                  />
                );
              })}
            </div>

            {productsByAesthetic[id].length > 4 && (
              <div className="text-center mt-6">
                <a 
                  href={`#${id}`} 
                  className="inline-flex items-center text-sm font-medium text-noir hover:underline"
                >
                  View all {count} {name} items
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default ProductGrid;
