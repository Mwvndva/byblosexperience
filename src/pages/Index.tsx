import { useState, useRef, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Aesthetic } from '@/types';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AestheticCategories from '@/components/AestheticCategories';
import ProductGrid from '@/components/ProductGrid';

type AestheticWithNone = Aesthetic | '';

const SCROLL_DELAY_MS = 100;

const Index = () => {
  const [selectedAesthetic, setSelectedAesthetic] = useState<AestheticWithNone>('');
  const aestheticSectionRef = useRef<HTMLDivElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToAestheticSection = () => {
    aestheticSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToProductGrid = () => {
    productGridRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleEventsClick = () => {
    startTransition(() => {
      navigate('/events');
    });
  };

  const handleAestheticChange = (aesthetic: Aesthetic) => {
    if (selectedAesthetic === aesthetic) return;
    
    setSelectedAesthetic(aesthetic);
    setTimeout(scrollToProductGrid, SCROLL_DELAY_MS);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        <HeroSection 
          onExploreClick={scrollToAestheticSection} 
          onEventsClick={handleEventsClick} 
        />
        
        <div ref={aestheticSectionRef}>
          <AestheticCategories 
            selectedAesthetic={selectedAesthetic}
            onAestheticChange={handleAestheticChange}
          />
        </div>
        
        <div ref={productGridRef}>
          <ProductGrid selectedAesthetic={selectedAesthetic} />
        </div>
      </main>

      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Byblos Atelier. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">Powered by Evolve</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
