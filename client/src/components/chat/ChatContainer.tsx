import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18n } from '@/hooks/useI18n';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { LanguageTestPanel } from './LanguageTestPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { Languages, Users, TestTube } from 'lucide-react';
import type { Message } from '@shared/schema';

interface ChatContainerProps {
  onOpenSettings: () => void;
}

export function ChatContainer({ onOpenSettings }: ChatContainerProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { isConnected, messages, sendMessage, setMessages } = useWebSocket();
  const { translateText } = useTranslation();
  const [translatedMessages, setTranslatedMessages] = useState<Map<number, string>>(new Map());
  const [showTestPanel, setShowTestPanel] = useState(false);

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
        // Only translate if auto-translate is enabled and the message is in a different language
        if (user.autoTranslate && message.originalLanguage !== user.preferredLanguage) {
          console.log(`Translating message ${message.id}: "${message.originalText}" from ${message.originalLanguage} to ${user.preferredLanguage}`);
          const translatedText = await translateText(
            message.originalText,
            message.originalLanguage,
            user.preferredLanguage || 'ja'
          );
          console.log(`Translation result: "${translatedText}"`);
          newTranslations.set(message.id, translatedText);
        }
      }
      
      console.log('Setting translations:', Object.fromEntries(newTranslations));
      setTranslatedMessages(prev => {
        const updated = new Map(prev);
        newTranslations.forEach((value, key) => {
          updated.set(key, value);
        });
        return updated;
      });
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
              {t('chat.title')}
            </h2>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {t('nav.online')}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Languages className="w-4 h-4" />
              <span>{t('chat.autoTranslate')}: {user?.autoTranslate ? t('chat.on') : t('chat.off')}</span>
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
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <LanguageTestPanel />
        </div>
      )}

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
                {t('chat.disconnected')}
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
