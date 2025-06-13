import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
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
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Profile</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
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
            <h4 className="text-sm font-medium text-foreground mb-3">Language Preferences</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="interfaceLanguage">Interface Language</Label>
                <Select 
                  value={settings.interfaceLanguage}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, interfaceLanguage: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="messageLanguage">Preferred Message Language</Label>
                <Select 
                  value={settings.preferredLanguage}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, preferredLanguage: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Translation Settings */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Translation Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="showOriginal" className="text-sm">
                  Show original text with translations
                </Label>
                <Switch
                  id="showOriginal"
                  checked={settings.showOriginalText}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showOriginalText: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="autoTranslate" className="text-sm">
                  Enable automatic translation
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
            <h4 className="text-sm font-medium text-foreground mb-3">Account</h4>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button 
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="flex-1"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
