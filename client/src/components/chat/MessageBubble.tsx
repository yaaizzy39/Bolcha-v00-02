import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal';
import { Languages, Check, CheckCheck, Reply, Trash2, Heart } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { getDisplayName, getCurrentProfileImage } from '@/lib/profileUtils';
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
  isMentioned?: boolean;
  totalLikes?: number;
  userLiked?: boolean;
  onToggleLike?: () => void;
  userProfileImage?: string;
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
  isHighlighted,
  isMentioned,
  totalLikes = 0,
  userLiked = false,
  onToggleLike,
  userProfileImage
}: MessageBubbleProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Get user's message alignment preference
  const messageAlignment = (user as any)?.messageAlignment || 'right';
  
  // Determine if this message should be displayed on the right side
  const shouldDisplayRight = isOwnMessage ? messageAlignment === 'right' : !isOwnMessage;
  
  // Check if this message needs translation
  const needsTranslation = String(message.originalLanguage) !== String(currentUserLanguage);
  
  // Check if we have completed translation
  const hasTranslation = Boolean(translatedText);
  
  // Determine display state
  const isTranslating = needsTranslation && !hasTranslation;
  const showBothTexts = needsTranslation && hasTranslation;

  // Get correct profile image URL
  const getProfileImageUrl = () => {
    if (isOwnMessage && user) {
      const ownImage = getCurrentProfileImage(user);
      console.log(`Own message profile image for ${message.senderId}:`, ownImage);
      return ownImage;
    }
    const profileImage = userProfileImage || message.senderProfileImageUrl;
    console.log(`Other message profile image for ${message.senderId}:`, {
      userProfileImage,
      senderProfileImageUrl: message.senderProfileImageUrl,
      final: profileImage
    });
    return profileImage;
  };


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

  // Function to convert URLs to clickable links and handle line breaks and mentions
  const renderTextWithLinks = (text: string | undefined, isOwnMessage: boolean = false) => {
    if (!text) return '';
    const safeText = String(text);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /(@\w+)/g;
    
    // First split by URLs, then handle mentions within each part
    const urlParts = safeText.split(urlRegex);
    
    return urlParts.map((part, index) => {
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
      
      // Handle mentions in non-URL parts
      const mentionParts = part.split(mentionRegex);
      return mentionParts.map((mentionPart, mentionIndex) => {
        if (mentionRegex.test(mentionPart)) {
          return (
            <span
              key={`${index}-mention-${mentionIndex}`}
              className={`font-semibold ${
                isOwnMessage 
                  ? 'text-blue-100 bg-blue-500/20 px-1 rounded' 
                  : 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 px-1 rounded'
              }`}
            >
              {mentionPart}
            </span>
          );
        }
        
        // Handle line breaks in non-URL, non-mention parts
        return mentionPart.split('\n').map((line, lineIndex, lines) => (
          <span key={`${index}-${mentionIndex}-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        ));
      });
    });
  };
  

  const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : '';

  if (isOwnMessage) {
    return (
      <div className={`group flex items-start gap-2 sm:gap-3 ${shouldDisplayRight ? 'justify-end' : 'justify-start'} px-2 sm:px-4 ${
        isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg p-2 -m-2 animate-pulse' : 
        isMentioned ? 'bg-blue-50/80 dark:bg-blue-900/20 rounded-lg p-2 -m-2 border-l-4 border-blue-400' : ''
      }`} id={`message-${message.id}`}>
        {/* Avatar on left when messageAlignment is left */}
        {!shouldDisplayRight && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={getProfileImageUrl() || undefined} />
            <AvatarFallback>
              {message.senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`flex flex-col ${shouldDisplayRight ? 'items-end ml-auto' : 'items-start mr-auto'} max-w-[85%] sm:max-w-lg`}>
          <div className={`bg-primary text-primary-foreground rounded-2xl ${shouldDisplayRight ? 'rounded-tr-md' : 'rounded-tl-md'} px-3 sm:px-4 py-2 sm:py-3`}>
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
            {showBothTexts ? (
              <div>
                <p className="mb-2">
                  {renderTextWithLinks(translatedText || '', true)}
                </p>
                <div className="text-xs text-amber-200/70 border-l-2 border-amber-200/40 pl-2 opacity-70">
                  {renderTextWithLinks(message.originalText || '', true)}
                </div>
              </div>
            ) : (
              <p>{renderTextWithLinks(message.originalText || '', true)}</p>
            )}
          </div>
          <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${shouldDisplayRight ? 'justify-end' : 'justify-start'}`}>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">{message.senderName}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">•</span>
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
                  onClick={() => setShowDeleteModal(true)}
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
        
        {/* Avatar on right when messageAlignment is right */}
        {shouldDisplayRight && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={getProfileImageUrl() || undefined} />
            <AvatarFallback>
              {message.senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <DeleteConfirmationModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onConfirm={() => onDelete && onDelete(message.id)}
          title="メッセージを削除"
          description="このメッセージを削除しますか？削除したメッセージは復元できません。"
          confirmText="削除"
          cancelText="キャンセル"
        />
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-2 sm:gap-3 justify-start px-2 sm:px-4 ${
      isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg p-2 -m-2 animate-pulse' : 
      isMentioned ? 'bg-blue-50/80 dark:bg-blue-900/20 rounded-lg p-2 -m-2 border-l-4 border-blue-400' : ''
    }`} id={`message-${message.id}`}>
      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
        <AvatarImage src={getProfileImageUrl() || undefined} />
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
          {showBothTexts ? (
            <div>
              <p className="text-foreground mb-2">
                {renderTextWithLinks(translatedText || '', false)}
              </p>
              <div className="text-xs text-gray-400 border-l-2 border-gray-300 pl-2 opacity-70">
                {renderTextWithLinks(message.originalText || '', false)}
              </div>
            </div>
          ) : (
            <p className="text-foreground">
              {renderTextWithLinks(message.originalText || '', false)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">{message.senderName}</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">•</span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(message)}
                className="h-6 w-6 p-0 text-xs hover:bg-muted/50"
              >
                <Reply className="w-3 h-3" />
              </Button>
            )}
            {onToggleLike && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleLike}
                className={`h-6 w-6 p-0 text-xs relative ${
                  userLiked 
                    ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' 
                    : 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <Heart className={`w-3 h-3 ${userLiked ? 'fill-current' : ''}`} />
                {totalLikes > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {totalLikes}
                  </span>
                )}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="h-6 w-6 p-0 text-xs hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <span>{timestamp}</span>
        </div>
        <DeleteConfirmationModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onConfirm={() => onDelete && onDelete(message.id)}
          title="メッセージを削除"
          description="このメッセージを削除しますか？削除したメッセージは復元できません。"
          confirmText="削除"
          cancelText="キャンセル"
        />
      </div>
    </div>
  );
}
