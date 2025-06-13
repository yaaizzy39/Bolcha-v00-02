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

interface RoomsListProps {
  onRoomSelect: (roomId: number) => void;
  selectedRoomId?: number;
}

export function RoomsList({ onRoomSelect, selectedRoomId }: RoomsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['/api/rooms'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return await apiRequest('/api/rooms', 'POST', data);
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
    onError: () => {
      toast({
        title: "エラー",
        description: "ルームの作成に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roomId: number) => {
      await apiRequest(`/api/rooms/${roomId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({
        title: "ルーム削除完了",
        description: "チャットルームが削除されました。",
      });
    },
  });

  const formatLastActivity = (timestamp: string | null) => {
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
    return room.createdBy === user?.id;
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">チャットルーム</h2>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          ルーム作成
        </Button>
      </div>

      <div className="space-y-2">
        {rooms.map((room: ChatRoom) => (
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
                  {room.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    0 メンバー
                  </Badge>
                  {canDeleteRoom(room) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-3 h-3" />
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
                <div>
                  作成者: {room.createdBy}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateRoomModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onRoomCreated={(room) => {
          onRoomSelect(room.id);
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}