import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Languages, Check, CheckCheck, Reply, Trash2 } from 'lucide-react';
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
  onDelete?: (messageId: number) => void;
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
  onDelete,
  isHighlighted
}: MessageBubbleProps) {
  const { t } = useI18n();
  // Show translation only if:
  // 1. We have translated text
  // 2. The message is in a different language than user's language  
  // 3. The translation is actually different from the original text
  const shouldShowTranslation = Boolean(translatedText) && 
    String(message.originalLanguage) !== String(currentUserLanguage) &&
    translatedText !== message.originalText;

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

  // Function to convert URLs to clickable links and handle line breaks
  const renderTextWithLinks = (text: string | undefined, isOwnMessage: boolean = false) => {
    if (!text) return '';
    const safeText = String(text);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = safeText.split(urlRegex);
    
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
      // Handle line breaks in non-URL parts
      return part.split('\n').map((line, lineIndex, lines) => (
        <span key={`${index}-${lineIndex}`}>
          {line}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      ));
    });
  };
  

  const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : '';

  if (isOwnMessage) {
    return (
      <div className={`group flex items-start gap-2 sm:gap-3 justify-end px-2 sm:px-4 ${isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg p-2 -m-2 animate-pulse' : ''}`} id={`message-${message.id}`}>
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-lg ml-auto">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-3 sm:px-4 py-2 sm:py-3">
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
            {shouldShowTranslation && (
              <div className="text-xs text-primary-foreground/70 mb-2 border-l-2 border-primary-foreground/30 pl-2">
                <div className="font-medium mb-1">原文:</div>
                {renderTextWithLinks(message.originalText || '', true)}
              </div>
            )}
            <p>{renderTextWithLinks(shouldShowTranslation ? (translatedText || '') : (message.originalText || ''), true)}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground justify-end">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
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
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('このメッセージを削除しますか？')) {
                      onDelete(message.id);
                    }
                  }}
                  className="h-6 px-2 text-xs hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  削除
                </Button>
              )}
            </div>
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
    <div className={`group flex items-start gap-2 sm:gap-3 justify-start px-2 sm:px-4 ${isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg p-2 -m-2 animate-pulse' : ''}`} id={`message-${message.id}`}>
      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
        <AvatarImage src={message.senderProfileImageUrl || undefined} />
        <AvatarFallback>
          {message.senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col items-start max-w-[85%] sm:max-w-lg mr-auto">
        <div className="bg-muted rounded-2xl rounded-tl-md px-3 sm:px-4 py-2 sm:py-3">
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
          {shouldShowTranslation && (
            <div className="text-xs text-muted-foreground mb-2 border-l-2 border-border pl-2">
              <div className="font-medium mb-1">原文:</div>
              {renderTextWithLinks(message.originalText || '', false)}
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
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 ml-auto">
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
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('このメッセージを削除しますか？')) {
                    onDelete(message.id);
                  }
                }}
                className="h-6 px-2 text-xs hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                削除
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
