import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18n } from '@/hooks/useI18n';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TranslationDemo } from './TranslationDemo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { Languages, Users, TestTube } from 'lucide-react';
import type { Message } from '@shared/schema';

interface ChatContainerProps {
  roomId: number;
  onOpenSettings: () => void;
}

export function ChatContainer({ roomId, onOpenSettings }: ChatContainerProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isConnected, messages: allMessages, sendMessage, setMessages: setAllMessages } = useWebSocket();
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const { translateText } = useTranslation();
  const [translatedMessages, setTranslatedMessages] = useState<Map<number, string>>(new Map());
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Load initial messages for the room
  useEffect(() => {
    if (initialMessages && Array.isArray(initialMessages)) {
      setRoomMessages(initialMessages);
    }
  }, [initialMessages]);

  // Filter WebSocket messages for current room
  useEffect(() => {
    console.log('Filtering messages for room:', roomId, 'allMessages:', allMessages.length);
    const newRoomMessages = allMessages.filter(msg => msg.roomId === roomId);
    console.log('Filtered messages for room', roomId, ':', newRoomMessages.length, 'messages');
    console.log('Current roomMessages count:', roomMessages.length);
    
    if (newRoomMessages.length !== roomMessages.length || 
        !newRoomMessages.every(msg => roomMessages.some(rm => rm.id === msg.id))) {
      console.log('Updating room messages:', newRoomMessages);
      setRoomMessages(newRoomMessages);
    }
  }, [allMessages, roomId]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [roomMessages]);

  // Translate messages based on user preference
  useEffect(() => {
    if (!user || !roomMessages.length) return;

    const translateMessages = async () => {
      const newTranslations = new Map<number, string>();
      
      for (const message of roomMessages) {
        // Only translate if auto-translate is enabled, message is in a different language, and not already translated
        if ((user as any).autoTranslate && 
            message.originalLanguage !== (user as any).preferredLanguage &&
            !translatedMessages.has(message.id)) {
          const translatedText = await translateText(
            message.originalText,
            message.originalLanguage,
            (user as any).preferredLanguage || 'ja'
          );
          newTranslations.set(message.id, translatedText);
        }
      }
      
      // Only update if we have new translations
      if (newTranslations.size > 0) {
        setTranslatedMessages(prev => {
          const updated = new Map(prev);
          newTranslations.forEach((value, key) => {
            updated.set(key, value);
          });
          return updated;
        });
      }
    };

    translateMessages();
  }, [roomMessages, user, translateText, translatedMessages]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    
    // Send message with the current room ID and reply information
    sendMessage(text.trim(), roomId, replyingTo);
    
    // Clear reply state after sending
    setReplyingTo(null);
    
    // Scroll to bottom after sending message with a slight delay
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
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
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {t('nav.online')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Languages className="w-4 h-4" />
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
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 py-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {roomMessages
              .filter((message: Message, index: number, self: Message[]) => 
                index === self.findIndex((m: Message) => m.id === message.id)
              )
              .map((message: Message) => (
                <MessageBubble
                  key={`msg-${message.id}`}
                  message={message}
                  translatedText={translatedMessages.get(message.id)}
                  isOwnMessage={message.senderId === (user as any)?.id}
                  showOriginal={(user as any)?.showOriginalText || false}
                  currentUserLanguage={(user as any)?.preferredLanguage || 'ja'}
                  onReply={handleReply}
                />
              ))}
            
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
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="flex-shrink-0">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      </div>
    </main>
  );
}
