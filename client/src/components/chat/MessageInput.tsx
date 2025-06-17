import { useState, useEffect, useMemo, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18n } from '@/hooks/useI18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupportedLanguages } from '@/lib/languageSupport';
import { Send, Smile, Globe, X, Reply } from 'lucide-react';
import type { Message } from '@shared/schema';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export function MessageInput({ onSendMessage, replyingTo, onCancelReply }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const { t } = useI18n();
  const { detectLanguage, translateText, isTranslating } = useTranslation();

  const detectedLanguage = message.trim() ? detectLanguage(message) : null;
  const [targetLanguage, setTargetLanguage] = useState<string>((user as any)?.preferredLanguage === 'ja' ? 'en' : 'ja');
  const [translatedPreview, setTranslatedPreview] = useState('');
  const supportedLanguages = useMemo(() => getSupportedLanguages(), []);

  useEffect(() => {
    let cancelled = false;

    const translate = async () => {
      if (!message.trim()) {
        setTranslatedPreview('');
        return;
      }
      const sourceLang = detectLanguage(message);
      if (sourceLang === targetLanguage) {
        setTranslatedPreview(message);
        return;
      }
      const translated = await translateText(message, sourceLang, targetLanguage);
      if (!cancelled) {
        setTranslatedPreview(translated);
      }
    };

    translate();
    return () => {
      cancelled = true;
    };
  }, [message, targetLanguage]);

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
      {/* Reply Preview */}
      {replyingTo && (
        <div className="mb-3 bg-muted/50 rounded-lg p-3 border-l-2 border-primary">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Reply className="w-4 h-4" />
              返信先: {replyingTo.senderName}
            </div>
            {onCancelReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelReply}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2">{replyingTo.originalText}</p>
        </div>
      )}
      
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? `${replyingTo.senderName}に返信...` : t('chat.placeholder')}
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
          
          {/* Target language dropdown */}
          <div className="mt-2">
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-xs">
                    {lang.nativeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Translated preview */}
          {translatedPreview && translatedPreview !== message && (
            <p className="mt-2 text-sm text-muted-foreground italic">
              {isTranslating ? 'Translating...' : translatedPreview}
            </p>
          )}

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
