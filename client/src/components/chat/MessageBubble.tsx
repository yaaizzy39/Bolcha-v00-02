import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Languages, Check, CheckCheck } from 'lucide-react';
import type { Message } from '@shared/schema';

interface MessageBubbleProps {
  message: Message;
  translatedText?: string;
  isOwnMessage: boolean;
  showOriginal: boolean;
  currentUserLanguage: string;
}

export function MessageBubble({ 
  message, 
  translatedText, 
  isOwnMessage, 
  showOriginal,
  currentUserLanguage 
}: MessageBubbleProps) {
  const shouldShowTranslation = translatedText && message.originalLanguage !== currentUserLanguage;
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  if (isOwnMessage) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="flex-1 max-w-lg">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 ml-auto">
            <p>{message.originalText}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground justify-end">
            <span>{timestamp}</span>
            <CheckCheck className="w-3 h-3 text-green-500" />
          </div>
        </div>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback>
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback>
          {message.senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 max-w-lg">
        <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
          {shouldShowTranslation && showOriginal && (
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Languages className="w-3 h-3" />
              Original ({message.originalLanguage}): {message.originalText}
            </div>
          )}
          <p className="text-foreground">
            {shouldShowTranslation ? translatedText : message.originalText}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{message.senderName}</span>
          <span>•</span>
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
}
