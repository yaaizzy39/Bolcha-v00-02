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
import { Languages, Users, TestTube, ArrowDown, Shield, Menu, MessageSquare } from 'lucide-react';
import type { Message, ChatRoom } from '@shared/schema';

// Room name translations
const roomNameTranslations: Record<string, Record<string, string>> = {
  'General Chat': {
    'ja': '一般チャット',
    'es': 'Chat General',
    'fr': 'Chat Général',
    'de': 'Allgemeiner Chat',
    'zh': '普通聊天',
    'ko': '일반 채팅',
    'pt': 'Chat Geral',
    'ru': 'Общий чат',
    'ar': 'دردشة عامة',
    'hi': 'सामान्य चैट',
    'it': 'Chat Generale',
    'nl': 'Algemene Chat',
    'th': 'แชททั่วไป',
    'vi': 'Trò chuyện chung'
  }
};

interface ChatContainerProps {
  roomId: number;
  onOpenSettings: () => void;
  onRoomSelect?: (roomId: number) => void;
}

export function ChatContainer({ roomId, onOpenSettings, onRoomSelect }: ChatContainerProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isConnected, messages: allMessages, deletedMessageIds, sendMessage, setMessages: setAllMessages } = useWebSocket();
  const queryClient = useQueryClient();
  
  // Get user's preferred language for room name translation
  // Try multiple possible language sources since the user might have updated language in UI but not persisted yet
  const userLanguage = (user as any)?.preferredLanguage || 
                      localStorage.getItem('selectedLanguage') || 
                      'ja';
  console.log('ChatContainer user data:', { user, userLanguage, localStorage: localStorage.getItem('selectedLanguage') });

  // Function to translate room names
  const translateRoomName = (roomName: string): string => {
    console.log('ChatContainer translateRoomName called:', { roomName, userLanguage, hasTranslation: !!roomNameTranslations[roomName] });
    if (roomNameTranslations[roomName] && roomNameTranslations[roomName][userLanguage]) {
      const translated = roomNameTranslations[roomName][userLanguage];
      console.log('ChatContainer room name translated:', { original: roomName, translated, language: userLanguage });
      return translated;
    }
    console.log('ChatContainer no translation found for room:', roomName, 'language:', userLanguage);
    return roomName; // Return original if no translation found
  };
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

  // Load all rooms for mobile selector
  const { data: allRooms = [] } = useQuery({
    queryKey: ['/api/rooms'],
    enabled: !!user,
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
      const newLanguage = (user as any).preferredLanguage;
      if (newLanguage !== localLanguage) {
        setLocalLanguage(newLanguage);
      }
    }
  }, [user, localLanguage]);
  
  // Clear translations when language changes
  useEffect(() => {
    if (currentLanguage) {
      console.log(`Language is now: ${currentLanguage}, clearing all translations`);
      setTranslatedMessages(new Map());
      // Force re-evaluation of translation needs after clearing
      setTimeout(() => {
        console.log(`Re-evaluating translations for language: ${currentLanguage}`);
      }, 100);
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
        message.originalLanguage && 
        message.originalLanguage !== currentLanguage && 
        !translatedMessages.has(message.id)
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
    <main className="flex-1 flex flex-col w-full h-full">
      {/* Mobile Room Selector */}
      <div className="lg:hidden bg-background border-b border-border p-3">
        <Select
          value={roomId.toString()}
          onValueChange={(value) => onRoomSelect?.(parseInt(value))}
        >
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <SelectValue placeholder="Select a room" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {(allRooms as ChatRoom[]).map((room) => (
              <SelectItem key={room.id} value={room.id.toString()}>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>{translateRoomName(room.name)}</span>
                  {room.adminOnly && (
                    <Badge variant="destructive" className="text-xs">
                      <Shield className="w-3 h-3" />
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Room Info */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white truncate">
              {currentRoom?.name ? translateRoomName(currentRoom.name) : t('chat.title')}
            </h2>
            {currentRoom?.description && (
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                {currentRoom.description}
              </span>
            )}
            {currentRoom?.adminOnly && (
              <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                <Shield className="w-3 h-3" />
                <span className="hidden xs:inline">Admin Only</span>
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Users className="w-3 h-3" />
              <span className="hidden xs:inline">{t('nav.online')}</span>
            </Badge>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <Select
                value={currentLanguage}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="w-[120px] sm:w-[200px] h-8 text-xs">
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
            
            {/* Auto-translate status */}
            <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{t('chat.autoTranslate')}: {(user as any)?.autoTranslate ? t('chat.on') : t('chat.off')}</span>
            </div>
            
            {/* Action buttons */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowTestPanel(!showTestPanel)}
              className="flex items-center gap-1 p-2"
            >
              <TestTube className="w-4 h-4" />
              <span className="hidden sm:inline">{showTestPanel ? 'テスト非表示' : 'テスト'}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenSettings} className="p-2">
              <span className="hidden sm:inline">{t('chat.settings')}</span>
              <span className="sm:hidden">設定</span>
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
          className="h-full px-2 sm:px-4 py-2 sm:py-4" 
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          <div className="space-y-2 sm:space-y-4 pb-4">
            {roomMessages
              .filter((message: Message, index: number, self: Message[]) => 
                index === self.findIndex((m: Message) => m.id === message.id)
              )
              .map((message: Message) => {
                const translation = translatedMessages.get(message.id);
                
                // Use multiple fallbacks to determine if message is from current user
                const currentUserId = (user as any)?.id || localStorage.getItem('currentUserId') || "19464369";
                const isOwnMessage = message.senderId === currentUserId;
                
                // Store current user ID in localStorage for consistency
                if ((user as any)?.id && localStorage.getItem('currentUserId') !== (user as any).id) {
                  localStorage.setItem('currentUserId', (user as any).id);
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
                    onDelete={message.senderId === currentUserId || (user as any)?.email === 'yaaizzy39@gmail.com' ? handleDeleteMessage : undefined}
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
