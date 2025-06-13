import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { getCurrentProfileImage, getDisplayName } from '@/lib/profileUtils';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { RoomsList } from '@/components/rooms/RoomsList';
import { CreateRoomModal } from '@/components/rooms/CreateRoomModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, MoreVertical, Settings, LogOut, Globe, Plus } from 'lucide-react';
import type { ChatRoom } from '@shared/schema';

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);

  // Fetch available rooms
  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ['/api/rooms'],
    enabled: !!user,
  });

  // Set default room when rooms are loaded
  useEffect(() => {
    if (rooms.length > 0 && selectedRoomId === undefined) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const displayName = getDisplayName(user);
  const currentProfileImage = getCurrentProfileImage(user);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <header className="bg-background shadow-sm border-b border-border flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-medium text-foreground">
                {t('nav.title')}
              </h1>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              {/* Mobile Create Room Button */}
              <Button 
                onClick={() => setCreateRoomOpen(true)}
                size="sm"
                className="lg:hidden"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* Language Indicator */}
              <div className="hidden sm:flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {(user as any)?.preferredLanguage === 'ja' ? t('language.japanese') : t('language.english')}
                </span>
              </div>

              {/* Online Status */}
              <Badge variant="secondary" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {t('nav.online')}
              </Badge>

              {/* User Profile */}
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={currentProfileImage} />
                  <AvatarFallback>
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {displayName}
                </span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      {t('nav.settings')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('nav.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-80 bg-background border-r border-border overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Rooms</h2>
            <RoomsList 
              onRoomSelect={setSelectedRoomId} 
              selectedRoomId={selectedRoomId || undefined}
            />
          </div>
        </aside>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          {selectedRoomId ? (
            <ChatContainer 
              roomId={selectedRoomId}
              onOpenSettings={() => setSettingsOpen(true)}
              onRoomSelect={setSelectedRoomId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  No chat rooms available
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Create your first room to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Create Room Modal */}
      <CreateRoomModal 
        open={createRoomOpen} 
        onOpenChange={setCreateRoomOpen}
        onRoomCreated={(room) => {
          setSelectedRoomId(room.id);
          setCreateRoomOpen(false);
        }}
      />
    </div>
  );
}
