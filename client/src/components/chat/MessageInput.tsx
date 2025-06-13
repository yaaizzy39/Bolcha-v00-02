import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18n } from '@/hooks/useI18n';
import { Send, Smile, Globe } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const { t } = useI18n();
  const { detectLanguage } = useTranslation();

  const detectedLanguage = message.trim() ? detectLanguage(message) : null;
  const targetLanguage = user?.preferredLanguage === 'ja' ? 'en' : 'ja';

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-background border-t border-border p-4 sticky bottom-0 z-10">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              rows={1}
              className="resize-none pr-12 max-h-32"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          
          {detectedLanguage && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Globe className="w-3 h-3" />
              <span>
                {t('chat.detected')}: {detectedLanguage === 'ja' ? t('language.japanese') : t('language.english')}
              </span>
              <span>→</span>
              <span>
                {t('chat.willTranslateTo')}: {targetLanguage === 'ja' ? t('language.japanese') : t('language.english')}
              </span>
            </div>
          )}
        </div>

        <Button 
          onClick={handleSend}
          disabled={!message.trim()}
          size="default"
          className="rounded-full p-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
