import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { ChatRoom } from '@shared/schema';

const createRoomSchema = z.object({
  name: z.string().min(1, 'ルーム名は必須です').max(255, 'ルーム名は255文字以内で入力してください'),
  description: z.string().max(1000, '説明は1000文字以内で入力してください').optional(),
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomCreated: (room: ChatRoom) => void;
}

export function CreateRoomModal({ open, onOpenChange, onRoomCreated }: CreateRoomModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateRoomForm) => {
      return await apiRequest('/api/rooms', 'POST', data);
    },
    onSuccess: (room: ChatRoom) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      toast({
        title: "ルーム作成完了",
        description: `チャットルーム「${room.name}」が作成されました。`,
      });
      form.reset();
      onRoomCreated(room);
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: "ルームの作成に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateRoomForm) => {
    createMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ルーム名</FormLabel>
                  <FormControl>
                    <Input placeholder="ルーム名を入力..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明（オプション）</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="ルーム説明を入力..." 
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createMutation.isPending}
              >
                キャンセル
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'ルーム作成中...' : 'ルーム作成'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}