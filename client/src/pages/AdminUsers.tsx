import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  isAdmin: boolean;
  createdAt?: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!(user as any)?.isAdmin,
  });

  // Mutation for admin toggle
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: string; isAdmin: boolean }) => {
      return await apiRequest('PUT', `/api/admin/users/${id}`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: '更新完了', description: 'ユーザー権限が更新されました' });
    },
    onError: (error: any) => {
      toast({
        title: 'エラー',
        description: `更新に失敗: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>ユーザー管理</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>読み込み中...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">ユーザーが見つかりません</div>
          ) : (
            <div className="space-y-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold">{u.email || u.first_name || u.id}</div>
                    <div className="text-xs text-gray-500">
                      {u.createdAt && (
                        <span>登録: {new Date(u.createdAt).toLocaleString('ja-JP')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={u.isAdmin ? 'default' : 'secondary'}>
                      {u.isAdmin ? '管理者' : '一般'}
                    </Badge>
                    <Switch
                      checked={u.isAdmin}
                      onCheckedChange={() =>
                        updateUserMutation.mutate({ id: u.id, isAdmin: !u.isAdmin })
                      }
                      disabled={updateUserMutation.isPending || (u.id === user?.sub)}
                    />
                    {u.id === user?.sub && (
                      <span className="text-xs text-gray-400">(自分)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
