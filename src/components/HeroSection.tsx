
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
  onEventsClick: () => void;
}

const HeroSection = ({ onExploreClick, onEventsClick }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-black/30 z-0" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1445205170230-053b83016042?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
      
      {/* Wavy lines pattern */}
      <div className="absolute inset-0 overflow-hidden opacity-5">
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 1200 1200" preserveAspectRatio="none">
            <defs>
              <pattern id="wavy-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path 
                  d="M0,50 C20,30 40,70 60,50 C80,30 100,70 120,50 C140,30 160,70 180,50 C200,30 220,70 240,50 C260,30 280,70 300,50" 
                  stroke="white" 
                  strokeWidth="2" 
                  fill="none"
                  strokeLinecap="round"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wavy-pattern)" />
          </svg>
        </div>
      </div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Have You Ever Been To
            <span className="text-yellow-300"> Byblos? </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto">
             [ cloud based thrift store / event management ]
          </p>
          
          {/* Description */}
          <p className="text-yellow-300 mb-12 max-w-xl mx-auto">
            "Nothing kills you faster than your own mind. Don't stress over things that are out of your control."
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              onClick={onExploreClick}
              className="bg-yellow-300 hover:bg-white text-black px-8 py-6 text-lg font-medium transition-colors duration-200"
            >
              Explore Collections
            </Button>
            <Button 
              onClick={onEventsClick}
              variant="outline"
              className="border-white text-black hover:bg-yellow-300 hover:border-yellow-300 hover:text-black px-8 py-6 text-lg font-medium transition-colors duration-200"
            >
              View Events & Tickets
            </Button>
          </div>

          {/* Scroll Indicator */}
          <div 
            onClick={onExploreClick}
            className="cursor-pointer flex flex-col items-center animate-bounce"
          >
            <span className="text-gray-400 text-sm mb-2">Discover Aesthetics</span>
            <ArrowDown className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
