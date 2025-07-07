import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Instagram, Calendar, ShoppingBag } from 'lucide-react';

const Header = () => {
  return (
    <header className="border-b border-yellow-300 bg-yellow-300 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="font-serif text-2xl font-bold text-noir">
              Byblos Experience
            </h1>
          </Link>

          {/* Empty navigation container to maintain layout */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Navigation links removed */}
          </div>

          {/* Seller Action and Social */}
          <div className="flex items-center space-x-4">
            <a 
              href="https://www.instagram.com/byblos.exp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-pink-600 hover:text-black transition-colors"
              aria-label="Visit our Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <div className="flex items-center space-x-2">
              <Link to="/organizer/events/new">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-black text-gray-700 hover:bg-gray-50 flex items-center gap-1 h-8 px-2 sm:px-3"
                  aria-label="Organizer"
                >
                  <Calendar className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  <span className="hidden sm:inline text-xs font-medium">Organizer</span>
                </Button>
              </Link>
              <Link to="/seller">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-black text-gray-700 hover:bg-gray-50 flex items-center gap-1 h-8 px-2 sm:px-3"
                  aria-label="Sell Clothes"
                >
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  <span className="hidden sm:inline text-xs font-medium">Sell</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
