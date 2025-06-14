import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Users, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { ChatRoom } from '@shared/schema';

// Room name translations
const roomNameTranslations: Record<string, Record<string, string>> = {
  'General Chat': {
    'ja': '一般チャット',
    'es': 'Chat General',
    'fr': 'Chat Général',
    'de': 'Allgemeiner Chat',
    'zh': '普通聊天',
    'ko': '일반 채팅',
    'pt': 'Chat Geral',
    'ru': 'Общий чат',
    'ar': 'دردشة عامة',
    'hi': 'सामान्य चैट',
    'it': 'Chat Generale',
    'nl': 'Algemene Chat',
    'th': 'แชททั่วไป',
    'vi': 'Trò chuyện chung'
  }
};

interface RoomsListProps {
  onRoomSelect: (roomId: number | undefined) => void;
  selectedRoomId?: number;
}

export function RoomsList({ onRoomSelect, selectedRoomId }: RoomsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');

  // Get user's preferred language for room name translation  
  // Try multiple possible language sources since the user might have updated language in UI but not persisted yet
  const userLanguage = (user as any)?.preferredLanguage || 
                      localStorage.getItem('selectedLanguage') || 
                      'ja';
  // Function to translate room names
  const translateRoomName = (roomName: string): string => {
    if (roomNameTranslations[roomName] && roomNameTranslations[roomName][userLanguage]) {
      return roomNameTranslations[roomName][userLanguage];
    }
    return roomName; // Return original if no translation found
  };

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['/api/rooms'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/rooms', data);
      return await response.json();
    },
    onSuccess: (room: ChatRoom) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({
        title: "ルーム作成完了",
        description: `チャットルーム「${room.name}」が作成されました。`,
      });
      setRoomName('');
      setRoomDescription('');
      setShowCreateModal(false);
      onRoomSelect(room.id);
    },
    onError: (error: Error) => {
      console.error('Room creation error:', error);
      toast({
        title: "エラー",
        description: "ルームの作成に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roomId: number) => {
      await apiRequest('DELETE', `/api/rooms/${roomId}`);
    },
    onSuccess: (_, deletedRoomId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      
      // If the deleted room was currently selected, clear the selection
      if (selectedRoomId === deletedRoomId) {
        onRoomSelect(undefined);
      }
      
      toast({
        title: "ルーム削除完了",
        description: "チャットルームが削除されました。",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: "ルームの削除に失敗しました。",
        variant: "destructive",
      });
    },
  });

  // Robust room ownership check with multiple authentication sources
  const isRoomOwner = (room: ChatRoom): boolean => {
    let currentUser = null;
    let source = '';

    // Try auth hook first
    if (user && (user as any)?.id) {
      currentUser = user;
      source = 'auth-hook';
    } else {
      // Fallback to cached user data
      const cachedUser = queryClient.getQueryData(['/api/auth/user']) as any;
      if (cachedUser && cachedUser.id) {
        currentUser = cachedUser;
        source = 'cache-fallback';
      }
    }

    if (!currentUser) {
      return false;
    }

    const userId = String((currentUser as any).id);
    const createdBy = String(room.createdBy);
    return userId === createdBy;
  };

  const formatLastActivity = (timestamp: string | Date | null) => {
    if (!timestamp) return '不明';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)}分前`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}時間前`;
    } else {
      return `${Math.floor(diffInHours / 24)}日前`;
    }
  };

  const canDeleteRoom = (room: ChatRoom) => {
    return isRoomOwner(room);
  };

  const handleCreateRoom = () => {
    if (roomName.trim()) {
      createMutation.mutate({
        name: roomName.trim(),
        description: roomDescription.trim() || ''
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">チャットルーム</h2>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            ルーム作成
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-2" style={{ 
        overflowY: 'auto', 
        WebkitOverflowScrolling: 'touch',
        maxHeight: 'calc(100vh - 140px)' 
      }}>
        {(rooms as ChatRoom[]).map((room: ChatRoom) => (
          <Card 
            key={room.id} 
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              selectedRoomId === room.id ? 'bg-muted border-primary' : ''
            }`}
            onClick={() => onRoomSelect(room.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {translateRoomName(room.name)}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs hidden sm:flex">
                    <Users className="w-3 h-3 mr-1" />
                    0 メンバー
                  </Badge>
                  {canDeleteRoom(room) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground sm:h-6 sm:w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4 sm:w-3 sm:h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>このルームを削除してもよろしいですか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            この操作は取り消せません。ルーム "{room.name}" とすべてのメッセージが削除されます。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(room.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            削除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              {room.description && (
                <CardDescription className="text-xs">
                  {room.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatLastActivity(room.lastActivity)}
                </div>
                <div className="hidden sm:block">
                  作成者: {room.createdBy}
                </div>
              </div>
              
              {/* Mobile-only action bar */}
              <div className="sm:hidden mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      0名
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      作成者: {room.createdBy}
                    </span>
                  </div>
                </div>
                
                {/* Delete button for room owner */}
                {isRoomOwner(room) ? (
                  <div className="w-full">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full h-9 text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          このルームを削除
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>このルームを削除してもよろしいですか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            この操作は取り消せません。ルーム "{room.name}" とすべてのメッセージが削除されます。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(room.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            削除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Room Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>新しいチャットルーム作成</DialogTitle>
            <DialogDescription>
              新しいチャットルームを作成します。ルーム名と説明を入力してください。
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ ルームは48時間非アクティブ後に自動削除されます
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ルーム名</label>
              <Input 
                placeholder="ルーム名を入力..." 
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">説明（オプション）</label>
              <Textarea 
                placeholder="ルーム説明を入力..." 
                className="resize-none"
                rows={3}
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={createMutation.isPending}
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleCreateRoom}
              disabled={createMutation.isPending || !roomName.trim()}
            >
              {createMutation.isPending ? 'ルーム作成中...' : 'ルーム作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}