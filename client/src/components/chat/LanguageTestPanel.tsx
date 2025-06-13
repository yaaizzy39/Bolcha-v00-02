import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18n } from '@/hooks/useI18n';
import { Globe, ArrowRight } from 'lucide-react';

export function LanguageTestPanel() {
  const { t } = useI18n();
  const { translateText, isTranslating } = useTranslation();
  const [testText, setTestText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('ja');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationResult, setTranslationResult] = useState('');

  const handleTest = async () => {
    if (!testText.trim()) return;
    
    const result = await translateText(testText, sourceLanguage, targetLanguage);
    setTranslationResult(result);
  };

  const swapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setTestText(translationResult);
    setTranslationResult('');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          翻訳テスト / Translation Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={swapLanguages}
            className="px-2"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              原文 / Source Text
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="翻訳したいテキストを入力してください..."
              className="w-full p-3 border rounded-md resize-none h-24"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              翻訳結果 / Translation Result
            </label>
            <div className="w-full p-3 border rounded-md h-24 bg-muted/50 overflow-auto">
              {translationResult || '翻訳結果がここに表示されます...'}
            </div>
          </div>
        </div>

        <Button 
          onClick={handleTest}
          disabled={!testText.trim() || isTranslating}
          className="w-full"
        >
          {isTranslating ? '翻訳中...' : '翻訳する / Translate'}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>このパネルを使用して翻訳機能をテストできます。</p>
          <p>Use this panel to test the translation functionality.</p>
        </div>
      </CardContent>
    </Card>
  );
}