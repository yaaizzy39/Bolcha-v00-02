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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, MoreVertical, Settings, LogOut, Globe, Plus } from 'lucide-react';
import type { ChatRoom } from '@shared/schema';

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);

  // Fetch available rooms
  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ['/api/rooms'],
    enabled: !!user,
  });

  // Validate selected room still exists after room list updates
  useEffect(() => {
    if (selectedRoomId && rooms.length > 0) {
      const roomExists = rooms.some(room => room.id === selectedRoomId);
      if (!roomExists) {
        // Clear selection if the selected room no longer exists
        console.log('Selected room no longer exists, clearing selection');
        setSelectedRoomId(undefined);
      }
    }
  }, [rooms, selectedRoomId]);

  // Listen for WebSocket room events
  useEffect(() => {
    const handleRoomCreated = (event: CustomEvent) => {
      console.log('Room creation event received:', event.detail);
      // Invalidate and refetch room list to show new room
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
    };

    const handleRoomDeleted = (event: CustomEvent) => {
      console.log('Room deletion event received:', event.detail);
      // Invalidate and refetch room list to remove deleted room
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      
      if (event.detail?.roomId === selectedRoomId) {
        console.log('Currently selected room was deleted, clearing selection');
        setSelectedRoomId(undefined);
      }
    };

    window.addEventListener('roomCreated', handleRoomCreated as EventListener);
    window.addEventListener('roomDeleted', handleRoomDeleted as EventListener);
    
    return () => {
      window.removeEventListener('roomCreated', handleRoomCreated as EventListener);
      window.removeEventListener('roomDeleted', handleRoomDeleted as EventListener);
    };
  }, [selectedRoomId, queryClient]);

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
                    {user && (user as any)?.isAdmin && (
                      <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                        <Globe className="w-4 h-4 mr-2" />
                        管理者設定
                      </DropdownMenuItem>
                    )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">ルーム一覧</h2>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="px-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                新規作成
              </Button>
            </div>
            {user ? (
              <RoomsList 
                onRoomSelect={setSelectedRoomId} 
                selectedRoomId={selectedRoomId || undefined}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                認証中...
              </div>
            )}
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
            <div className="flex-1 overflow-hidden lg:hidden">
              {/* Mobile Room List */}
              <div className="h-full flex flex-col">
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ルーム一覧</h2>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      size="sm"
                      className="px-3"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      新規作成
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <RoomsList 
                    onRoomSelect={setSelectedRoomId} 
                    selectedRoomId={selectedRoomId || undefined}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Create Room Modal */}
      <CreateRoomModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onRoomCreated={(room) => {
          setSelectedRoomId(room.id);
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}
