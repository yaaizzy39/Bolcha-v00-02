import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { Languages, Users } from 'lucide-react';
import type { Message } from '@shared/schema';

interface ChatContainerProps {
  onOpenSettings: () => void;
}

export function ChatContainer({ onOpenSettings }: ChatContainerProps) {
  const { user } = useAuth();
  const { isConnected, messages, sendMessage, setMessages } = useWebSocket();
  const { translateText } = useTranslation();
  const [translatedMessages, setTranslatedMessages] = useState<Map<number, string>>(new Map());

  // Load initial messages
  const { data: initialMessages } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!user,
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  // Translate messages based on user preference
  useEffect(() => {
    if (!user || !messages.length) return;

    const translateMessages = async () => {
      const newTranslations = new Map<number, string>();
      
      for (const message of messages) {
        if (message.originalLanguage !== user.preferredLanguage && user.autoTranslate) {
          const translatedText = await translateText(
            message.originalText,
            message.originalLanguage,
            user.preferredLanguage || 'en'
          );
          newTranslations.set(message.id, translatedText);
        }
      }
      
      setTranslatedMessages(newTranslations);
    };

    translateMessages();
  }, [messages, user, translateText]);

  const handleSendMessage = (text: string) => {
    sendMessage(text);
  };

  return (
    <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Global Chat Room
            </h2>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Online
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Languages className="w-4 h-4" />
              <span>Auto-translate: {user?.autoTranslate ? 'ON' : 'OFF'}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              translatedText={translatedMessages.get(message.id)}
              isOwnMessage={message.senderId === user?.id}
              showOriginal={user?.showOriginalText || false}
              currentUserLanguage={user?.preferredLanguage || 'en'}
            />
          ))}
          
          {!isConnected && (
            <div className="flex justify-center">
              <Badge variant="destructive">
                Disconnected - Attempting to reconnect...
              </Badge>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} />
    </main>
  );
}
