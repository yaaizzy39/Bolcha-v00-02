import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
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
    preferredLanguage: 'en',
    interfaceLanguage: 'en',
    showOriginalText: true,
    autoTranslate: true,
  });

  useEffect(() => {
    if (user) {
      setSettings({
        preferredLanguage: user.preferredLanguage || 'en',
        interfaceLanguage: user.interfaceLanguage || 'en',
        showOriginalText: user.showOriginalText ?? true,
        autoTranslate: user.autoTranslate ?? true,
      });
    }
  }, [user]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      await apiRequest('PATCH', '/api/user/settings', newSettings);
    },
    onSuccess: () => {
      toast({
        title: t('settings.saved'),
        description: t('settings.savedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('settings.error'),
        description: t('settings.errorDesc'),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">{t('settings.profile')}</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">{t('settings.displayName')}</Label>
                <Input
                  id="displayName"
                  value={user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.email?.split('@')[0] || ''
                  }
                  disabled
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Language Preferences */}
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t('language.english')}</SelectItem>
                    <SelectItem value="ja">{t('language.japanese')}</SelectItem>
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t('language.english')}</SelectItem>
                    <SelectItem value="ja">{t('language.japanese')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Translation Settings */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">{t('settings.translationSettings')}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="showOriginal" className="text-sm">
                  {t('settings.showOriginal')}
                </Label>
                <Switch
                  id="showOriginal"
                  checked={settings.showOriginalText}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showOriginalText: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="autoTranslate" className="text-sm">
                  {t('settings.autoTranslate')}
                </Label>
                <Switch
                  id="autoTranslate"
                  checked={settings.autoTranslate}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoTranslate: checked }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Actions */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">{t('settings.account')}</h4>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              {t('nav.signOut')}
            </Button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button 
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="flex-1"
          >
            {updateSettingsMutation.isPending ? t('settings.saving') : t('settings.save')}
          </Button>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t('settings.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
