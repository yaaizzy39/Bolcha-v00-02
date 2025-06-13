import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Languages, Check, CheckCheck, Reply } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import type { Message } from '@shared/schema';

interface MessageBubbleProps {
  message: Message;
  translatedText?: string;
  isOwnMessage: boolean;
  showOriginal: boolean;
  currentUserLanguage: string;
  onReply?: (message: Message) => void;
  onNavigateToMessage?: (messageId: number) => void;
  isHighlighted?: boolean;
}

export function MessageBubble({ 
  message, 
  translatedText, 
  isOwnMessage, 
  showOriginal,
  currentUserLanguage,
  onReply,
  onNavigateToMessage,
  isHighlighted
}: MessageBubbleProps) {
  const { t } = useI18n();
  const shouldShowTranslation = translatedText && message.originalLanguage !== currentUserLanguage;

  // Function to handle link click with warning
  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `このリンクを開きますか？\n\n${url}\n\n外部サイトのリンクです。信頼できるサイトかどうか確認してください。`
    );
    if (confirmed) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Function to convert URLs to clickable links
  const renderTextWithLinks = (text: string, isOwnMessage: boolean = false) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            onClick={(e) => handleLinkClick(e, part)}
            className={`underline break-all cursor-pointer hover:opacity-80 ${
              isOwnMessage 
                ? 'text-blue-100 hover:text-blue-50' 
                : 'text-blue-600 hover:text-blue-700'
            }`}
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
      <div className={`flex items-start gap-3 justify-end ${isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg p-2 -m-2 animate-pulse' : ''}`} id={`message-${message.id}`}>
        <div className="flex-1 max-w-lg">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 ml-auto">
            {message.replyToId && (
              <div 
                className="bg-primary-foreground/10 rounded-lg p-2 mb-2 border-l-2 border-primary-foreground/30 cursor-pointer hover:bg-primary-foreground/20 transition-colors"
                onClick={() => onNavigateToMessage?.(message.replyToId!)}
              >
                <div className="text-xs text-primary-foreground/70 flex items-center gap-1 mb-1">
                  <Reply className="w-3 h-3" />
                  返信先: {message.replyToSenderName}
                </div>
                <p className="text-sm text-primary-foreground/90 line-clamp-2">{message.replyToText}</p>
              </div>
            )}
            {shouldShowTranslation && showOriginal && (
              <div className="text-xs text-primary-foreground/70 mb-2 flex items-center gap-1">
                <Languages className="w-3 h-3" />
                {t('chat.original')} ({message.originalLanguage}): {renderTextWithLinks(message.originalText, true)}
              </div>
            )}
            <p>{renderTextWithLinks(shouldShowTranslation ? translatedText : message.originalText, true)}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground justify-end">
            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(message)}
                className="h-6 px-2 text-xs hover:bg-muted/50"
              >
                <Reply className="w-3 h-3 mr-1" />
                返信
              </Button>
            )}
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
    <div className={`flex items-start gap-3 ${isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg p-2 -m-2 animate-pulse' : ''}`} id={`message-${message.id}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.senderProfileImageUrl || undefined} />
        <AvatarFallback>
          {message.senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 max-w-lg">
        <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
          {message.replyToId && (
            <div 
              className="bg-background/50 rounded-lg p-2 mb-2 border-l-2 border-border cursor-pointer hover:bg-background/70 transition-colors"
              onClick={() => onNavigateToMessage?.(message.replyToId!)}
            >
              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Reply className="w-3 h-3" />
                返信先: {message.replyToSenderName}
              </div>
              <p className="text-sm text-foreground/80 line-clamp-2">{message.replyToText}</p>
            </div>
          )}
          {shouldShowTranslation && showOriginal && (
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Languages className="w-3 h-3" />
              {t('chat.original')} ({message.originalLanguage}): {renderTextWithLinks(message.originalText, false)}
            </div>
          )}
          <p className="text-foreground">
            {renderTextWithLinks(shouldShowTranslation ? translatedText : message.originalText, false)}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{message.senderName}</span>
          <span>•</span>
          <span>{timestamp}</span>
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(message)}
              className="h-6 px-2 text-xs hover:bg-muted/50 ml-auto"
            >
              <Reply className="w-3 h-3 mr-1" />
              返信
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
