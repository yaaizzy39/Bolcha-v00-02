import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Camera, Globe, Upload, RotateCcw } from 'lucide-react';

export function ProfileImageUpload() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Get the current profile image to display
  const currentUser = user as any;
  const currentProfileImage = currentUser?.useCustomProfileImage 
    ? currentUser?.customProfileImageUrl 
    : currentUser?.profileImageUrl;

  const displayName = currentUser?.firstName && currentUser?.lastName 
    ? `${currentUser.firstName} ${currentUser.lastName}` 
    : currentUser?.email?.split('@')[0] || 'User';

  // Mutation to update profile image
  const updateProfileImageMutation = useMutation({
    mutationFn: async ({ imageUrl, useCustom }: { imageUrl: string; useCustom: boolean }) => {
      return await apiRequest('POST', '/api/user/profile-image', { imageUrl, useCustom });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile image updated",
        description: "Your profile image has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to toggle between Google and custom image
  const toggleImageMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/user/toggle-profile-image');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile image switched",
        description: currentUser?.useCustomProfileImage 
          ? "Switched to Google profile image." 
          : "Switched to custom profile image.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to switch profile image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Convert file to base64 data URL for simple storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        updateProfileImageMutation.mutate({ imageUrl: dataUrl, useCustom: true });
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read the image file.",
          variant: "destructive",
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Error",
        description: "Failed to process the image.",
        variant: "destructive",
      });
    }
  };

  const handleUrlUpload = () => {
    if (!imageUrl.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL.",
        variant: "destructive",
      });
      return;
    }

    updateProfileImageMutation.mutate({ imageUrl: imageUrl.trim(), useCustom: true });
    setImageUrl('');
  };

  const handleToggleImage = () => {
    if (!currentUser?.customProfileImageUrl && !currentUser?.useCustomProfileImage) {
      toast({
        title: "No custom image",
        description: "Please upload a custom image first.",
        variant: "destructive",
      });
      return;
    }
    
    toggleImageMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4">
          <AvatarImage 
            src={currentProfileImage} 
            alt={displayName}
            className="object-cover"
          />
          <AvatarFallback className="text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-lg font-medium">{displayName}</h3>
        <p className="text-sm text-muted-foreground">
          {currentUser?.useCustomProfileImage ? 'Custom Image' : 'Google Account Image'}
        </p>
      </div>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <Label className="text-sm font-medium">Upload Image File</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || updateProfileImageMutation.isPending}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Choose File'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Max 2MB, JPG/PNG
            </span>
          </div>
        </div>

        {/* URL Upload */}
        <div>
          <Label className="text-sm font-medium">Or Enter Image URL</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleUrlUpload}
              disabled={!imageUrl.trim() || updateProfileImageMutation.isPending}
              size="sm"
            >
              Upload
            </Button>
          </div>
        </div>

        {/* Toggle between Google and Custom */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {currentUser?.useCustomProfileImage ? (
              <Camera className="w-5 h-5 text-primary" />
            ) : (
              <Globe className="w-5 h-5 text-blue-500" />
            )}
            <div>
              <p className="font-medium">
                {currentUser?.useCustomProfileImage ? 'Custom Image' : 'Google Account Image'}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentUser?.useCustomProfileImage 
                  ? 'Using your uploaded image'
                  : 'Using your Google profile picture'
                }
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleImage}
            disabled={toggleImageMutation.isPending}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Switch
          </Button>
        </div>
      </div>
    </div>
  );
}