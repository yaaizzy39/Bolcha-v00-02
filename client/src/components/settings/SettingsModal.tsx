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

  const [settings, setSettings] = useState({
    preferredLanguage: 'ja',
    interfaceLanguage: 'ja',
    showOriginalText: true,
    autoTranslate: true,
  });

  // Update local settings when user data changes
  useEffect(() => {
    if (user) {
      setSettings({
        preferredLanguage: (user as any)?.preferredLanguage || 'ja',
        interfaceLanguage: (user as any)?.interfaceLanguage || 'ja',
        showOriginalText: (user as any)?.showOriginalText ?? true,
        autoTranslate: (user as any)?.autoTranslate ?? true,
      });
    }
  }, [user]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      return await apiRequest('PATCH', '/api/user/settings', newSettings);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      
      // Get current user data without causing re-renders
      const currentUser = queryClient.getQueryData(['/api/auth/user']) as any;
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          ...data
        };
        
        // Update cache directly without triggering watchers
        queryClient.setQueryData(['/api/auth/user'], updatedUser);
        
        // Update localStorage immediately for WebSocket persistence
        localStorage.setItem('wsUserData', JSON.stringify(updatedUser));
        
        // Store settings in localStorage for immediate UI updates
        localStorage.setItem('userSettings', JSON.stringify({
          preferredLanguage: updatedUser.preferredLanguage || 'ja',
          interfaceLanguage: updatedUser.interfaceLanguage || 'ja', 
          showOriginalText: updatedUser.showOriginalText ?? true,
          autoTranslate: updatedUser.autoTranslate ?? true,
        }));
        
        // Update local state
        setSettings({
          preferredLanguage: updatedUser.preferredLanguage || 'ja',
          interfaceLanguage: updatedUser.interfaceLanguage || 'ja', 
          showOriginalText: updatedUser.showOriginalText ?? true,
          autoTranslate: updatedUser.autoTranslate ?? true,
        });
      }
      
      toast({
        title: "設定更新完了", 
        description: "設定が正常に保存されました。",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Prevent closing modal during update to avoid re-renders
    updateSettingsMutation.mutate(settings);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">プロフィール</TabsTrigger>
            <TabsTrigger value="language">言語設定</TabsTrigger>
            <TabsTrigger value="translation">翻訳設定</TabsTrigger>
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
                    onValueChange={(value) => setSettings(prev => ({ ...prev, interfaceLanguage: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="言語を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSupportedLanguages().map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="messageLanguage">{t('settings.messageLanguage')}</Label>
                  <Select 
                    value={settings.preferredLanguage}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, preferredLanguage: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="言語を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSupportedLanguages().map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </SelectItem>
                      ))}
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
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoTranslate: checked }))}
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
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showOriginalText: checked }))}
                  />
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
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? t('settings.saving') : t('settings.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}