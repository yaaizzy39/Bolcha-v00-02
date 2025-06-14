import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Globe, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CulturalContext {
  originalPhrase: string;
  culturalMeaning: string;
  literalTranslation: string;
  contextualNote: string;
  category: 'idiom' | 'honorific' | 'cultural' | 'wordplay' | 'historical';
}

interface CulturalContextTooltipProps {
  text: string;
  originalLanguage: string;
  targetLanguage: string;
  children: React.ReactNode;
}

// Cultural context database for common expressions
const culturalContexts: Record<string, Record<string, CulturalContext[]>> = {
  'ja': {
    'en': [
      {
        originalPhrase: 'お疲れさま',
        culturalMeaning: 'A versatile expression of appreciation for effort, used when greeting colleagues or acknowledging work completion',
        literalTranslation: 'You are tired',
        contextualNote: 'This phrase has no direct English equivalent - it expresses empathy and recognition of effort rather than actual fatigue',
        category: 'cultural'
      },
      {
        originalPhrase: 'よろしくお願いします',
        culturalMeaning: 'A humble request for favorable consideration, goodwill, and cooperation in future interactions',
        literalTranslation: 'Please treat me favorably',
        contextualNote: 'Essential in Japanese business and social contexts, expressing humility and building relationships',
        category: 'cultural'
      },
      {
        originalPhrase: 'いただきます',
        culturalMeaning: 'Expression of gratitude before eating, acknowledging the life given and effort of those who prepared the food',
        literalTranslation: 'I humbly receive',
        contextualNote: 'Reflects Buddhist concepts of interconnectedness and gratitude for all elements that brought food to the table',
        category: 'cultural'
      },
      {
        originalPhrase: 'すみません',
        culturalMeaning: 'Multi-purpose expression covering apology, excuse me, thank you, and attention-getting',
        literalTranslation: 'It does not end/settle',
        contextualNote: 'Implies an ongoing debt of gratitude or responsibility that cannot be fully repaid',
        category: 'cultural'
      },
      {
        originalPhrase: '空気を読む',
        culturalMeaning: 'The ability to sense the mood and unspoken expectations in a social situation',
        literalTranslation: 'Read the air',
        contextualNote: 'Central concept in Japanese social harmony - understanding context without explicit communication',
        category: 'idiom'
      },
      {
        originalPhrase: 'がんばって',
        culturalMeaning: 'Encouragement to persist with effort and determination despite challenges',
        literalTranslation: 'Do your best with perseverance',
        contextualNote: 'Embodies the Japanese value of persistence (ganbaru) - effort is valued regardless of outcome',
        category: 'cultural'
      }
    ]
  },
  'en': {
    'ja': [
      {
        originalPhrase: 'break a leg',
        culturalMeaning: 'A theatrical good luck wish that ironically wishes for injury to avoid jinxing performance',
        literalTranslation: '足を折る',
        contextualNote: 'Theater superstition - saying "good luck" is considered bad luck, so the opposite is said',
        category: 'idiom'
      },
      {
        originalPhrase: 'bite the bullet',
        culturalMeaning: 'Face a difficult situation with courage and determination',
        literalTranslation: '弾丸を噛む',
        contextualNote: 'Historical reference to soldiers biting bullets during surgery before anesthesia',
        category: 'historical'
      },
      {
        originalPhrase: 'spill the tea',
        culturalMeaning: 'Share gossip or reveal secrets, especially juicy information',
        literalTranslation: 'お茶をこぼす',
        contextualNote: 'Modern slang from drag culture and social media, "tea" means gossip or drama',
        category: 'cultural'
      }
    ]
  }
};

export function CulturalContextTooltip({ 
  text, 
  originalLanguage, 
  targetLanguage, 
  children 
}: CulturalContextTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Find cultural context for the given text
  const findCulturalContext = (): CulturalContext | null => {
    const languageContexts = culturalContexts[originalLanguage]?.[targetLanguage];
    if (!languageContexts) return null;

    return languageContexts.find(context => 
      text.toLowerCase().includes(context.originalPhrase.toLowerCase()) ||
      context.originalPhrase.toLowerCase().includes(text.toLowerCase())
    ) || null;
  };

  const culturalContext = findCulturalContext();

  // Don't render tooltip if no cultural context found
  if (!culturalContext) {
    return <>{children}</>;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'idiom': return <BookOpen className="w-4 h-4" />;
      case 'cultural': return <Globe className="w-4 h-4" />;
      case 'historical': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'idiom': return 'text-purple-600 dark:text-purple-400';
      case 'cultural': return 'text-blue-600 dark:text-blue-400';
      case 'historical': return 'text-amber-600 dark:text-amber-400';
      case 'honorific': return 'text-green-600 dark:text-green-400';
      case 'wordplay': return 'text-pink-600 dark:text-pink-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <span className="relative inline-block">
            {children}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="absolute -top-1 -right-1"
            >
              <div className={`w-3 h-3 rounded-full ${getCategoryColor(culturalContext.category)} bg-current opacity-60 animate-pulse`} />
            </motion.div>
          </span>
        </TooltipTrigger>
        
        <AnimatePresence>
          {isOpen && (
            <TooltipContent 
              side="top" 
              className="max-w-sm p-0 bg-white dark:bg-gray-800 border shadow-lg"
              asChild
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={getCategoryColor(culturalContext.category)}>
                      {getCategoryIcon(culturalContext.category)}
                    </div>
                    <span className={`text-sm font-medium capitalize ${getCategoryColor(culturalContext.category)}`}>
                      {culturalContext.category}
                    </span>
                  </div>

                  {/* Original phrase */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      "{culturalContext.originalPhrase}"
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Literal: {culturalContext.literalTranslation}
                    </p>
                  </div>

                  {/* Cultural meaning */}
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cultural Meaning:
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {culturalContext.culturalMeaning}
                    </p>
                  </div>

                  {/* Context note */}
                  <div className="border-t pt-3">
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Context:
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                      {culturalContext.contextualNote}
                    </p>
                  </div>
                </div>
              </motion.div>
            </TooltipContent>
          )}
        </AnimatePresence>
      </Tooltip>
    </TooltipProvider>
  );
}