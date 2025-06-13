import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Languages, Check, CheckCheck } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
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
  const { t } = useI18n();
  const shouldShowTranslation = translatedText && message.originalLanguage !== currentUserLanguage;

  // Function to convert URLs to clickable links
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };
  
  // Debug log for translation display
  // console.log(`Message ${message.id}: shouldShowTranslation=${shouldShowTranslation}, translatedText="${translatedText}", originalLang=${message.originalLanguage}, userLang=${currentUserLanguage}`);
  const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : '';

  if (isOwnMessage) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="flex-1 max-w-lg">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 ml-auto">
            {shouldShowTranslation && showOriginal && (
              <div className="text-xs text-primary-foreground/70 mb-2 flex items-center gap-1">
                <Languages className="w-3 h-3" />
                {t('chat.original')} ({message.originalLanguage}): {renderTextWithLinks(message.originalText)}
              </div>
            )}
            <p>{renderTextWithLinks(shouldShowTranslation ? translatedText : message.originalText)}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground justify-end">
            <span>{timestamp}</span>
            <CheckCheck className="w-3 h-3 text-green-500" />
          </div>
        </div>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.senderProfileImageUrl || undefined} />
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
        <AvatarImage src={message.senderProfileImageUrl || undefined} />
        <AvatarFallback>
          {message.senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 max-w-lg">
        <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
          {shouldShowTranslation && showOriginal && (
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Languages className="w-3 h-3" />
              {t('chat.original')} ({message.originalLanguage}): {renderTextWithLinks(message.originalText)}
            </div>
          )}
          <p className="text-foreground">
            {renderTextWithLinks(shouldShowTranslation ? translatedText : message.originalText)}
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
