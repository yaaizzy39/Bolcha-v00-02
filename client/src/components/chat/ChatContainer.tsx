import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18n } from '@/hooks/useI18n';
import { MessageBubble } from './MessageBubble';
import { MentionInput, type MentionInputRef } from './MentionInput';
import { TranslationDemo } from './TranslationDemo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getSupportedLanguages } from '@/lib/languageSupport';
import { Languages, Users, TestTube, ArrowDown, Shield } from 'lucide-react';
import type { Message } from '@shared/schema';

interface ChatContainerProps {
  roomId: number;
  onOpenSettings: () => void;
}

export function ChatContainer({ roomId, onOpenSettings }: ChatContainerProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isConnected, messages: allMessages, deletedMessageIds, sendMessage, setMessages: setAllMessages } = useWebSocket();
  const queryClient = useQueryClient();
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const { translateText } = useTranslation();
  const [translatedMessages, setTranslatedMessages] = useState<Map<number, string>>(new Map());
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mentionInputRef = useRef<MentionInputRef>(null);

  // Load initial messages for the current room
  const { data: initialMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/messages', roomId],
    queryFn: () => fetch(`/api/messages/${roomId}`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!user && !!roomId,
  });

  // Load current room information
  const { data: currentRoom } = useQuery({
    queryKey: ['/api/rooms', roomId],
    queryFn: () => fetch(`/api/rooms/${roomId}`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!user && !!roomId,
  });

  // Clear messages and reload when room changes
  useEffect(() => {
    setRoomMessages([]);
    if (roomId) {
      refetchMessages();
    }
  }, [roomId, refetchMessages]);

  // Merge initial messages from database with real-time WebSocket messages
  useEffect(() => {
    const dbMessages = initialMessages && Array.isArray(initialMessages) ? initialMessages : [];
    const wsMessages = allMessages.filter(msg => msg.roomId === roomId);
    
    // Create a map to deduplicate messages by ID
    const messageMap = new Map<number, Message>();
    
    // Add database messages first, but skip deleted ones
    dbMessages.forEach(msg => {
      if (msg.id && !deletedMessageIds.has(msg.id)) {
        messageMap.set(msg.id, msg);
      }
    });
    
    // Add/update with WebSocket messages (newer data), but skip deleted ones
    wsMessages.forEach(msg => {
      if (msg.id && !deletedMessageIds.has(msg.id)) {
        messageMap.set(msg.id, msg);
      }
    });
    
    // Convert back to array and sort by timestamp
    const mergedMessages = Array.from(messageMap.values())
      .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
    
    console.log('Merged messages for room', roomId, ':', mergedMessages.length, 'total messages');
    setRoomMessages(mergedMessages);
  }, [initialMessages, allMessages, roomId, deletedMessageIds]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollToBottom(false);
  };

  // Check if user is near bottom of scroll area
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.target as HTMLDivElement;
    const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 100;
    setShowScrollToBottom(!isNearBottom && roomMessages.length > 0);
  };

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (!showScrollToBottom) {
      // Use multiple scroll attempts to ensure it works with dynamic content
      setTimeout(() => scrollToBottom(), 50);
      setTimeout(() => scrollToBottom(), 150);
      setTimeout(() => scrollToBottom(), 300);
    }
  }, [roomMessages, showScrollToBottom]);

  // Language state with local management for UI responsiveness
  const [localLanguage, setLocalLanguage] = useState<string>((user as any)?.preferredLanguage || 'ja');
  const currentLanguage = localLanguage;

  // Sync local language with user data
  useEffect(() => {
    if (user && (user as any).preferredLanguage) {
      setLocalLanguage((user as any).preferredLanguage);
    }
  }, [user]);
  
  // Clear translations when language changes
  useEffect(() => {
    if (currentLanguage) {
      console.log(`Language is now: ${currentLanguage}, clearing all translations`);
      setTranslatedMessages(new Map());
    }
  }, [currentLanguage]);

  // Translate messages based on user preference
  useEffect(() => {
    if (!user || !roomMessages.length) return;
    
    // Enable translation for all users by default when language is different from message language
    console.log(`Translation check: user autoTranslate = ${(user as any).autoTranslate}, current language = ${currentLanguage}`);

    let cancelled = false;
    
    const translateMessages = async () => {
      const messagesToTranslate = roomMessages.filter(message => 
        message.originalLanguage !== currentLanguage && !translatedMessages.has(message.id)
      );

      for (const message of messagesToTranslate) {
        if (cancelled) break;
        
        console.log(`Translating message ${message.id} from ${message.originalLanguage} to ${currentLanguage}`);
        try {
          const translatedText = await translateText(
            message.originalText,
            message.originalLanguage,
            currentLanguage
          );
          
          if (!cancelled) {
            console.log(`Setting translation for message ${message.id}: "${translatedText}"`);
            setTranslatedMessages(prev => {
              const newMap = new Map(prev);
              newMap.set(message.id, translatedText);
              console.log(`Translation map updated, size: ${newMap.size}, message ${message.id} = "${newMap.get(message.id)}"`);
              return newMap;
            });
          }
        } catch (error) {
          console.error(`Translation failed for message ${message.id}:`, error);
        }
      }
    };

    const timeoutId = setTimeout(translateMessages, 300);
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [roomMessages, user, translateText, currentLanguage]);

  const handleSendMessage = (text: string, mentions?: string[]) => {
    if (!text.trim()) return;
    
    // Send message with the current room ID and reply information
    sendMessage(text.trim(), roomId, replyingTo, mentions);
    
    // Clear reply state after sending
    setReplyingTo(null);
    
    // Force scroll to bottom after sending message
    // Use multiple timeouts to ensure scroll happens after DOM updates
    setTimeout(() => {
      scrollToBottom();
    }, 50);
    
    setTimeout(() => {
      scrollToBottom();
    }, 200);
    
    setTimeout(() => {
      scrollToBottom();
    }, 500);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    // Focus the message input after setting reply
    setTimeout(() => {
      mentionInputRef.current?.focus();
    }, 100);
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      // Message will be removed via WebSocket broadcast
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('メッセージの削除に失敗しました');
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleNavigateToMessage = (messageId: number) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the message temporarily
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000); // Remove highlight after 3 seconds
    }
  };

  // Language change mutation
  const updateLanguageMutation = useMutation({
    mutationFn: async (newLanguage: string) => {
      return apiRequest('PATCH', '/api/user/settings', { 
        preferredLanguage: newLanguage 
      });
    },
    onSuccess: (updatedUser) => {
      const newLang = (updatedUser as any)?.preferredLanguage;
      console.log('Language updated successfully to:', newLang);
      // Immediately update local language state for UI responsiveness
      if (newLang) {
        setLocalLanguage(newLang);
      }
      // Update the query cache with new user data
      queryClient.setQueryData(['/api/auth/user'], updatedUser);
    },
    onError: (error) => {
      console.error('Language update failed:', error);
    },
  });

  const handleLanguageChange = (newLanguage: string) => {
    console.log(`User selected language: ${newLanguage}, current language: ${currentLanguage}`);
    // Immediately update local state for responsive UI
    setLocalLanguage(newLanguage);
    // Then update on server
    updateLanguageMutation.mutate(newLanguage);
  };

  return (
    <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full h-full">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              {currentRoom?.name || t('chat.title')}
            </h2>
            {currentRoom?.description && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentRoom.description}
              </span>
            )}
            {currentRoom?.adminOnly && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Admin Only
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {t('nav.online')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <Select
                value={currentLanguage}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder={
                    getSupportedLanguages().find(lang => lang.code === currentLanguage)?.nativeName || currentLanguage
                  } />
                </SelectTrigger>
                <SelectContent>
                  {getSupportedLanguages().map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{t('chat.autoTranslate')}: {(user as any)?.autoTranslate ? t('chat.on') : t('chat.off')}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowTestPanel(!showTestPanel)}
              className="flex items-center gap-1"
            >
              <TestTube className="w-4 h-4" />
              {showTestPanel ? 'テスト非表示' : 'テスト'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              {t('chat.settings')}
            </Button>
          </div>
        </div>
      </div>

      {/* Translation Test Panel */}
      {showTestPanel && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <TranslationDemo />
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea 
          className="h-full px-4 py-4" 
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          <div className="space-y-4 pb-4">
            {roomMessages
              .filter((message: Message, index: number, self: Message[]) => 
                index === self.findIndex((m: Message) => m.id === message.id)
              )
              .map((message: Message) => {
                const translation = translatedMessages.get(message.id);
                const isOwnMessage = message.senderId === (user as any)?.id;
                
                // Debug logging for layout issues - check all messages from current user
                if (message.senderId === "19464369") {
                  console.log(`Message ${message.id} layout check:`, {
                    senderId: message.senderId,
                    userId: (user as any)?.id,
                    isOwnMessage,
                    senderName: message.senderName,
                    userObject: user
                  });
                }
                
                return (
                  <MessageBubble
                    key={`msg-${message.id}`}
                    message={message}
                    translatedText={translation}
                    isOwnMessage={isOwnMessage}
                    showOriginal={(user as any)?.showOriginalText || false}
                    currentUserLanguage={currentLanguage}
                    onReply={handleReply}
                    onNavigateToMessage={handleNavigateToMessage}
                    onDelete={message.senderId === (user as any)?.id || (user as any)?.isAdmin ? handleDeleteMessage : undefined}
                    isHighlighted={highlightedMessageId === message.id}
                  />
                );
              })}
            
            {!isConnected && (
              <div className="flex justify-center">
                <Badge variant="destructive">
                  {t('chat.disconnected')}
                </Badge>
              </div>
            )}
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Jump to Latest Button */}
        {showScrollToBottom && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              onClick={scrollToBottom}
              size="sm"
              className="shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0">
        {currentRoom?.adminOnly && !(user as any)?.isAdmin ? (
          <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield className="w-4 h-4" />
              <span>This room is restricted to administrators only</span>
            </div>
          </div>
        ) : (
          <MentionInput 
            ref={mentionInputRef}
            onSendMessage={handleSendMessage} 
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
            roomId={roomId}
          />
        )}
      </div>
    </main>
  );
}
