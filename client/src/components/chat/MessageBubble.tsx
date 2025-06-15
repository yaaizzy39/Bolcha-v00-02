import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal';
import { Languages, Check, CheckCheck, Reply, Trash2, Heart, RotateCcw } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { getDisplayName, getCurrentProfileImage } from '@/lib/profileUtils';
import { CulturalContextTooltip } from './CulturalContextTooltip';
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
  onTranslate?: (messageId: number, text: string, sourceLanguage: string, targetLanguage: string) => void;
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
  userProfileImage,
  onTranslate
}: MessageBubbleProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Get user's message alignment preference
  const messageAlignment = (user as any)?.messageAlignment || 'right';
  
  // Determine if this message should be displayed on the right side
  const shouldDisplayRight = isOwnMessage && messageAlignment === 'right';
  
  // Enhanced translation logic - show translate button for any Japanese text
  const isJapanese = message.originalLanguage === 'ja' || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(message.originalText || '');
  const hasTranslation = Boolean(translatedText && translatedText !== message.originalText);
  const showTranslateButton = isJapanese && !hasTranslation && currentUserLanguage !== 'ja';
  

  
  // Get correct profile image URL from enhanced message data
  const getProfileImageUrl = () => {
    if (userProfileImage) return userProfileImage;
    if ((user as any)?.useCustomProfileImage && (user as any)?.customProfileImageUrl) {
      return (user as any).customProfileImageUrl;
    }
    return getCurrentProfileImage(user);
  };

  // Get sender display name
  const getSenderDisplayName = () => {
    if (message.senderName) return message.senderName;
    if (isOwnMessage) return getDisplayName(user);
    return message.senderId || 'Unknown User';
  };

  const renderTextWithLinks = (text: string, allowLineBreaks = false) => {
    if (!text) return '';
    
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /@[\w\s]+/g;
    
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      // Check if this part is a URL
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline hover:no-underline ${
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
    minute: '2-digit',
    hour12: false 
  }) : '';

  // For own messages on right side
  if (shouldDisplayRight) {
    return (
      <div className={`group flex items-start gap-2 sm:gap-3 justify-end px-2 sm:px-4 ${
        isHighlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg p-2 -m-2 animate-pulse' : 
        isMentioned ? 'bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-2 -m-2' : ''
      }`}>
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%]">
          <div className={`rounded-lg px-3 py-2 max-w-full break-words ${
            isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-foreground'
          }`}>
            {message.replyToText && (
              <div 
                className="bg-black/10 dark:bg-white/10 rounded p-2 mb-2 cursor-pointer text-xs border-l-2 border-primary-foreground/40"
                onClick={() => message.replyToId && onNavigateToMessage?.(message.replyToId)}
              >
                <div className="font-medium text-primary-foreground/80 mb-1">
                  返信先: {message.replyToSenderName || 'Unknown User'}
                </div>
                <p className="text-sm text-primary-foreground/90 line-clamp-2">{message.replyToText}</p>
              </div>
            )}
            
            {hasTranslation ? (
              <div>
                <p className="mb-2">
                  <CulturalContextTooltip
                    text={message.originalText || ''}
                    originalLanguage={message.originalLanguage || 'en'}
                    targetLanguage={currentUserLanguage}
                  >
                    {renderTextWithLinks(translatedText || '', true)}
                  </CulturalContextTooltip>
                </p>
                <div className="text-xs text-primary-foreground/60 border-l-2 border-primary-foreground/30 pl-2 mt-1">
                  {renderTextWithLinks(message.originalText || '', true)}
                </div>
              </div>
            ) : (
              <p>{renderTextWithLinks(message.originalText || '', true)}</p>
            )}
          </div>
          
          <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${shouldDisplayRight ? 'justify-end' : 'justify-start'}`}>
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
              
              {showTranslateButton && onTranslate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log(`🔵 Translate button clicked for message ${message.id}`);
                    onTranslate(
                      message.id, 
                      message.originalText || '', 
                      message.originalLanguage || 'ja', 
                      currentUserLanguage
                    );
                  }}
                  className="h-6 px-2 text-xs hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/20"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  翻訳
                </Button>
              )}
              
              {onToggleLike && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleLike}
                  className={`h-6 px-2 text-xs ${
                    userLiked 
                      ? 'text-red-500 hover:text-red-600' 
                      : 'hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-3 h-3 mr-1 ${userLiked ? 'fill-current' : ''}`} />
                  {totalLikes > 0 && <span className="ml-1">{totalLikes}</span>}
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
              {getSenderDisplayName().charAt(0).toUpperCase()}
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
      isMentioned ? 'bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-2 -m-2' : ''
    }`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={getProfileImageUrl() || undefined} />
        <AvatarFallback>
          {getSenderDisplayName().charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col items-start max-w-[85%] sm:max-w-[70%]">
        <div className={`rounded-lg px-3 py-2 max-w-full break-words ${
          isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-foreground'
        }`}>
          {message.replyToText && (
            <div 
              className="bg-black/10 dark:bg-white/10 rounded p-2 mb-2 cursor-pointer text-xs border-l-2 border-muted-foreground/40"
              onClick={() => message.replyToId && onNavigateToMessage?.(message.replyToId)}
            >
              <div className="font-medium text-muted-foreground mb-1">
                返信先: {message.replyToSenderName || 'Unknown User'}
              </div>
              <p className="text-sm text-muted-foreground/90 line-clamp-2">{message.replyToText}</p>
            </div>
          )}
          
          {hasTranslation ? (
            <div>
              <p className="mb-2">
                <CulturalContextTooltip
                  text={message.originalText || ''}
                  originalLanguage={message.originalLanguage || 'en'}
                  targetLanguage={currentUserLanguage}
                >
                  {renderTextWithLinks(translatedText || '', true)}
                </CulturalContextTooltip>
              </p>
              <div className="text-xs text-muted-foreground border-l-2 border-muted-foreground/30 pl-2 mt-1 opacity-70">
                {renderTextWithLinks(message.originalText || '', true)}
              </div>
            </div>
          ) : (
            <p>{renderTextWithLinks(message.originalText || '', true)}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground justify-start">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSenderDisplayName()}</span>
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
            
            {showTranslateButton && onTranslate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log(`🔵 Translate button clicked for message ${message.id}`);
                  onTranslate(
                    message.id, 
                    message.originalText || '', 
                    message.originalLanguage || 'ja', 
                    currentUserLanguage
                  );
                }}
                className="h-6 px-2 text-xs hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/20"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                翻訳
              </Button>
            )}
            
            {onToggleLike && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleLike}
                className={`h-6 px-2 text-xs ${
                  userLiked 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'hover:text-red-500'
                }`}
              >
                <Heart className={`w-3 h-3 mr-1 ${userLiked ? 'fill-current' : ''}`} />
                {totalLikes > 0 && <span className="ml-1">{totalLikes}</span>}
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
          <Check className="w-3 h-3 text-green-500" />
        </div>
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
  );
}