
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
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
        style={{
          backgroundImage: 'url(/herowallpaper/blackboredapewallpaper.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          imageRendering: 'crisp-edges',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            Have You Ever Been To
            <span className="block sm:inline text-yellow-300"> Byblos? </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Events Thrifts Music
          </p>
          
          {/* Description */}
          <p className="text-yellow-300 text-base sm:text-lg mb-8 sm:mb-12 max-w-xl mx-auto px-2">
            "Nothing kills you faster than your own mind. Don't stress over things that are out of your control."
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 w-full">
            <Button 
              onClick={onExploreClick}
              className="bg-yellow-300 hover:bg-white text-black px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-medium transition-colors duration-200 w-full sm:w-auto"
            >
              Explore Collections
            </Button>
            <Button 
              onClick={onEventsClick}
              variant="outline"
              className="border-yellow-300 text-black hover:bg-yellow-300 hover:border-yellow-300 hover:text-black px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-medium transition-colors duration-200 w-full sm:w-auto"
            >
              View Events & Tickets
            </Button>
          </div>

          {/* Scroll Indicator */}
          <div 
            onClick={onExploreClick}
            className="cursor-pointer flex flex-col items-center animate-bounce pt-4 sm:pt-0"
          >
            <span className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">Discover Aesthetics</span>
            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
