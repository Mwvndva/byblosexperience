
import type { Aesthetic } from '../types';

type AestheticWithNone = Aesthetic | '';
import { Card } from '@/components/ui/card';

export interface AestheticCategory {
  id: Aesthetic;
  title: string;
  description: string;
  wornBy: string;
  vibe: string;
  color: string;
  hoverColor: string;
  accent: string;
}

export const aestheticCategories: AestheticCategory[] = [
  {
    id: 'afro-futuristic',
    title: 'Afro-Futuristic',
    description: 'Bold prints, tech-inspired cuts, Ankara with neon, modern armor vibes',
    wornBy: 'Artists, Afrobeats lovers, urban dancers',
    vibe: 'Wakanda-core meets Nairobi street',
    color: 'bg-gradient-to-r from-purple-900 to-blue-900 text-white',
    hoverColor: 'hover:scale-105',
    accent: 'border-purple-500'
  },
  {
    id: 'nairobi-noir',
    title: 'Nairobi Noir',
    description: 'All-black outfits, trench coats, sunglasses, Doc Martens',
    wornBy: 'Poets, alt creatives, photographers, moody Tumblr kids',
    vibe: 'Nairobi goth. Think deep, silent power',
    color: 'bg-gray-900 text-white',
    hoverColor: 'hover:bg-gray-800',
    accent: 'border-gray-600'
  },
  {
    id: 'boho-kitenge',
    title: 'Boho Kitenge',
    description: 'Flowing dresses, kitenge wrap skirts, headscarves, earthy tones',
    wornBy: 'Wellness queens, coastal dreamers, creative entrepreneurs',
    vibe: 'Afro-bohemian goddess energy',
    color: 'bg-gradient-to-r from-amber-800 to-amber-600 text-white',
    hoverColor: 'hover:scale-105',
    accent: 'border-amber-400'
  },
  {
    id: 'matatu-core',
    title: 'Matatu Core / Genge Drip',
    description: 'Loud logos, graphic tees, baggy jeans, sneakers, flashy accessories',
    wornBy: 'Gen Z rebels, dancers, fans of drill/gengetone',
    vibe: 'Streetwear born from Nairobi\'s matatu culture and hip-hop heat',
    color: 'bg-gradient-to-r from-yellow-400 to-red-600 text-black',
    hoverColor: 'hover:scale-105',
    accent: 'border-yellow-300'
  },
  {
    id: 'coastal-chill',
    title: 'Coastal Chill (Swahili Luxe)',
    description: 'Linen sets, kanzus, kikoys, Swahili caps, neutral tones',
    wornBy: 'Mombasa boys, Lamu locals, chill rich aunties',
    vibe: 'Serenity + drip + coconut water',
    color: 'bg-gradient-to-r from-blue-400 to-teal-300 text-white',
    hoverColor: 'hover:scale-105',
    accent: 'border-blue-300'
  },
  {
    id: 'floral-queen',
    title: 'Floral Queen',
    description: 'Flower dresses, pastel colors, chokers, soft girl aesthetics',
    wornBy: 'TikTok queens, brunch besties, soft life advocates',
    vibe: 'Romantic, sweet, Pinterest-core',
    color: 'bg-gradient-to-r from-pink-300 to-purple-300 text-white',
    hoverColor: 'hover:scale-105',
    accent: 'border-pink-200'
  },
  {
    id: 'boda-baddie',
    title: 'Boda Baddie',
    description: 'Leather jackets, boots, edgy jeans, sunglasses, biker-chic with Kenyan swagger',
    wornBy: 'Urban riders, music video extras, stunt queens',
    vibe: 'Dangerously stylish',
    color: 'bg-gradient-to-r from-gray-900 to-gray-700 text-white',
    hoverColor: 'hover:scale-105',
    accent: 'border-red-500'
  },
  {
    id: 'corporate-clean',
    title: 'Corporate Clean',
    description: 'Tailored suits, trench coats, muted colors, sleek handbags',
    wornBy: 'Nairobi CBD professionals, LinkedIn influencers, career girlies',
    vibe: 'Power + polish + poise',
    color: 'bg-gradient-to-r from-gray-600 to-gray-400 text-white',
    hoverColor: 'hover:scale-105',
    accent: 'border-gray-300'
  },
  {
    id: 'diaspora-flex',
    title: 'Diaspora Flex',
    description: 'Branded streetwear, designer shoes, cropped jackets, trendy glasses',
    wornBy: 'People fresh off the plane or flexing on Instagram',
    vibe: 'I shop online and you\'ll know it',
    color: 'bg-gradient-to-r from-purple-900 to-pink-500 text-white',
    hoverColor: 'hover:scale-105',
    accent: 'border-pink-300'
  }
];

interface AestheticCategoriesProps {
  onAestheticChange: (aesthetic: Aesthetic) => void;
  selectedAesthetic: AestheticWithNone;
}

const AestheticCategories = ({ onAestheticChange, selectedAesthetic }: AestheticCategoriesProps) => {
  return (
    <section className="py-16 bg-black relative border-t-4 border-yellow-300">
      <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: 'url(/backgroundwallpaper/byblosbackground.png)' }} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-yellow-300 mb-4">
            Choose Your Aesthetic
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {selectedAesthetic 
              ? `Showing ${selectedAesthetic.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} collection`
              : 'Discover curated pieces that speak to your style. Each aesthetic tells a story of personal expression.'
            }
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {aestheticCategories.map((category) => (
            <Card
              key={category.id}
              className={`
                relative overflow-hidden cursor-pointer transition-all duration-300 transform
                ${category.color} ${category.hoverColor}
                ${selectedAesthetic === category.id ? `ring-4 ring-offset-4 ${category.accent}` : ''}
                h-64 border-0 shadow-lg hover:shadow-xl
              `}
              onClick={() => onAestheticChange(category.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onAestheticChange(category.id)}
              aria-label={`Select ${category.title} aesthetic`}
            >
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-3xl font-bold mb-1">
                    {category.title}
                  </h3>
                  <p className="text-sm opacity-90 mb-1">
                    {category.description}
                  </p>
                  <p className="text-xs opacity-90 mb-1">
                    {category.wornBy}
                  </p>
                  <p className="text-xs opacity-90 italic">
                    {category.vibe}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium opacity-75">
                    Explore Collection
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-lg">→</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-black/70 -z-10" />
    </section>
  );
};

export default AestheticCategories;
