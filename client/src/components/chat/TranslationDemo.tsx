import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Languages, ArrowRight, User, MessageCircle } from 'lucide-react';

export function TranslationDemo() {
  const { user } = useAuth();
  const { translateText } = useTranslation();
  const [demoResults, setDemoResults] = useState<{
    jaToEn: string | null;
    enToJa: string | null;
  }>({
    jaToEn: null,
    enToJa: null
  });

  const runTranslationDemo = async () => {
    setDemoResults({ jaToEn: null, enToJa: null });
    
    // Test Japanese to English
    const jaToEn = await translateText('こんにちは、元気ですか？', 'ja', 'en');
    
    // Test English to Japanese  
    const enToJa = await translateText('Hello, how are you?', 'en', 'ja');
    
    setDemoResults({ jaToEn, enToJa });
  };

  const currentLang = (user as any)?.preferredLanguage || 'ja';
  const otherLang = currentLang === 'ja' ? 'en' : 'ja';

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          翻訳デモ - チャット翻訳の動作確認
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          現在の設定言語: 
          <Badge variant="outline">{currentLang === 'ja' ? '日本語' : 'English'}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Japanese to English */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="w-4 h-4" />
              <span className="font-medium">日本語 → English</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <strong>原文:</strong> こんにちは、元気ですか？
              </div>
              <div className="flex items-center justify-center py-2">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded min-h-[3rem] flex items-center">
                <strong>翻訳結果:</strong> {demoResults.jaToEn || '翻訳を実行してください'}
              </div>
            </div>
          </div>

          {/* English to Japanese */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Languages className="w-4 h-4" />
              <span className="font-medium">English → 日本語</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <strong>Original:</strong> Hello, how are you?
              </div>
              <div className="flex items-center justify-center py-2">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded min-h-[3rem] flex items-center">
                <strong>Translation:</strong> {demoResults.enToJa || '翻訳を実行してください'}
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={runTranslationDemo}
          className="w-full"
          size="lg"
        >
          <Languages className="w-4 h-4 mr-2" />
          翻訳デモを実行 / Run Translation Demo
        </Button>

        <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="font-medium mb-2">実際のチャットでの翻訳テスト方法:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>設定画面で言語を「{otherLang === 'ja' ? '日本語' : 'English'}」に変更</li>
            <li>チャットで「{currentLang === 'ja' ? 'こんにちは' : 'Hello'}」と送信</li>
            <li>メッセージが自動的に{otherLang === 'ja' ? '日本語' : '英語'}に翻訳されることを確認</li>
            <li>設定で「原文を表示」を有効にすると、翻訳前の文章も表示されます</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}