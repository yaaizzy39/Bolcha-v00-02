import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ProfileImageUpload } from './ProfileImageUpload';
import { getSupportedLanguages } from '@/lib/languageSupport';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize settings with user data or defaults
  const getUserSettings = () => {
    if (user) {
      return {
        interfaceLanguage: (user as any)?.interfaceLanguage || 'ja',
        showOriginalText: (user as any)?.showOriginalText ?? true,
        autoTranslate: (user as any)?.autoTranslate ?? true,
        messageAlignment: (user as any)?.messageAlignment || 'right',
      };
    }
    return {
      interfaceLanguage: 'ja',
      showOriginalText: true,
      autoTranslate: true,
      messageAlignment: 'right',
    };
  };

  const [settings, setSettings] = useState(getUserSettings);

  // Update local settings when user data changes
  useEffect(() => {
    if (user) {
      const newSettings = getUserSettings();
      setSettings(newSettings);
    }
  }, [user]);

  // Simplified update function that doesn't use mutation
  const updateSetting = async (key: keyof typeof settings, value: any) => {
    try {
      console.log(`Updating ${key} to:`, value);
      
      // Create new settings with updated value
      const newSettings = { ...settings, [key]: value };
      console.log('New settings object:', newSettings);
      
      // Update local state immediately
      setSettings(newSettings);
      
      // Make API call
      const response = await apiRequest('PATCH', '/api/user/settings', newSettings);
      const data = await response.json();
      console.log('API response:', data);
      
      // Update cache and localStorage
      const currentUser = queryClient.getQueryData(['/api/auth/user']) as any;
      if (currentUser) {
        const updatedUser = { ...currentUser, ...data };
        queryClient.setQueryData(['/api/auth/user'], updatedUser);
        localStorage.setItem('wsUserData', JSON.stringify(updatedUser));
        localStorage.setItem('currentUserId', String(updatedUser.id));
        localStorage.setItem('userSettings', JSON.stringify({
          preferredLanguage: updatedUser.preferredLanguage || 'ja',
          interfaceLanguage: updatedUser.interfaceLanguage || 'ja',
          showOriginalText: updatedUser.showOriginalText ?? true,
          autoTranslate: updatedUser.autoTranslate ?? true,
          messageAlignment: updatedUser.messageAlignment || 'right',
        }));
      }
      
      console.log(`${key} updated successfully`);
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
      // Revert on error
      setSettings(settings);
    }
  };

  const handleSave = () => {
    // Settings are already saved automatically when changed
    console.log('Settings are auto-saved');
    // Close the modal
    onOpenChange(false);
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              {settings.interfaceLanguage === 'en' ? 'Profile' : 'プロフィール'}
            </TabsTrigger>
            <TabsTrigger value="language">
              {settings.interfaceLanguage === 'en' ? 'Language' : '言語'}
            </TabsTrigger>
            <TabsTrigger value="translation">
              {settings.interfaceLanguage === 'en' ? 'Translation' : '翻訳'}
            </TabsTrigger>
            <TabsTrigger value="ui">
              {settings.interfaceLanguage === 'en' ? 'UI' : 'UI'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <ProfileImageUpload />
          </TabsContent>

          <TabsContent value="language" className="space-y-6 mt-6">
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">{t('settings.languagePreferences')}</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="interfaceLanguage">{t('settings.interfaceLanguage')}</Label>
                  <Select 
                    value={settings.interfaceLanguage}
                    onValueChange={(value) => updateSetting('interfaceLanguage', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="言語を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                

              </div>
            </div>
          </TabsContent>

          <TabsContent value="translation" className="space-y-6 mt-6">
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">{t('settings.translationPreferences')}</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('settings.autoTranslate')}</Label>
                    <div className="text-sm text-muted-foreground">
                      {t('settings.autoTranslateDescription')}
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoTranslate}
                    onCheckedChange={(checked) => updateSetting('autoTranslate', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t('settings.showOriginalText')}</Label>
                    <div className="text-sm text-muted-foreground">
                      {t('settings.showOriginalTextDescription')}
                    </div>
                  </div>
                  <Switch
                    checked={settings.showOriginalText}
                    onCheckedChange={(checked) => updateSetting('showOriginalText', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ui" className="space-y-6 mt-6">
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">
                {settings.interfaceLanguage === 'en' ? 'UI Preferences' : 'UI設定'}
              </h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="messageAlignment">
                    {settings.interfaceLanguage === 'en' ? 'My Message Position' : '自分のメッセージ位置'}
                  </Label>
                  <Select 
                    value={settings.messageAlignment}
                    onValueChange={(value) => updateSetting('messageAlignment', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">
                        {settings.interfaceLanguage === 'en' ? 'Right side (default)' : '右側（デフォルト）'}
                      </SelectItem>
                      <SelectItem value="left">
                        {settings.interfaceLanguage === 'en' ? 'Left side' : '左側'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-muted-foreground mt-1">
                    {settings.interfaceLanguage === 'en' 
                      ? 'Choose which side your messages appear on in the chat'
                      : 'チャット画面で自分のメッセージがどちら側に表示されるかを選択'}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleLogout}>
            {t('nav.signOut')}
          </Button>
          <Button 
            onClick={handleSave}
          >
            {t('settings.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}