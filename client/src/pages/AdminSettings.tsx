import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { TranslationApi, InsertTranslationApi } from "@shared/schema";
import AdminUsers from "./AdminUsers";

interface NewApiForm {
  name: string;
  url: string;
  priority: number;
  isActive: boolean;
}

export default function AdminSettings() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newApi, setNewApi] = useState<NewApiForm>({
    name: '',
    url: '',
    priority: 1,
    isActive: true
  });

  const [tab, setTab] = useState<'api' | 'users'>('api');

  // Fetch translation APIs
  const { data: apis = [], isLoading: apisLoading } = useQuery<TranslationApi[]>({
    queryKey: ['/api/admin/translation-apis'],
    enabled: !!(user as any)?.isAdmin,
  });

  // Create API mutation
  const createApiMutation = useMutation({
    mutationFn: async (apiData: InsertTranslationApi) => {
      return await apiRequest('POST', '/api/translation-apis/create', apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/translation-apis'] });
      setNewApi({ name: '', url: '', priority: 1, isActive: true });
      toast({
        title: "API作成完了",
        description: "新しい翻訳APIが追加されました",
      });
    },
    onError: (error: any) => {
      console.error('Create API error:', error);
      toast({
        title: "エラー",
        description: `APIの作成に失敗しました: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Update API mutation
  const updateApiMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<TranslationApi> }) => {
      return await apiRequest('PUT', `/api/admin/translation-apis/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/translation-apis'] });
      toast({
        title: "更新完了",
        description: "翻訳APIが更新されました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "APIの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Delete API mutation
  const deleteApiMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/admin/translation-apis/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/translation-apis'] });
      toast({
        title: "削除完了",
        description: "翻訳APIが削除されました",
      });
    },
    onError: (error: any) => {
      console.error('Delete API error:', error);
      toast({
        title: "エラー",
        description: `APIの削除に失敗しました: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateApi = () => {
    if (!newApi.name || !newApi.url) {
      toast({
        title: "入力エラー",
        description: "名前とURLを入力してください",
        variant: "destructive",
      });
      return;
    }

    createApiMutation.mutate(newApi);
  };

  const handleToggleActive = (api: TranslationApi) => {
    updateApiMutation.mutate({
      id: api.id,
      updates: { isActive: !api.isActive }
    });
  };

  const handlePriorityChange = (api: TranslationApi, newPriority: number) => {
    updateApiMutation.mutate({
      id: api.id,
      updates: { priority: newPriority }
    });
  };

  const handleDeleteApi = (id: number) => {
    if (confirm('この翻訳APIを削除しますか？')) {
      deleteApiMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (!(user as any)?.isAdmin) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold mb-2">アクセス拒否</h2>
        <p>この機能は管理者のみ利用できます</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-8">
      <div className="flex gap-4 mb-6">
        <Button variant={tab === 'api' ? 'default' : 'outline'} onClick={() => setTab('api')}>翻訳API管理</Button>
        <Button variant={tab === 'users' ? 'default' : 'outline'} onClick={() => setTab('users')}>ユーザー管理</Button>
      </div>
      {tab === 'api' && (
        <>
          {/* New API Form */}
          <Card>
            <CardHeader>
              <CardTitle>翻訳API追加</CardTitle>
              <CardDescription>
                新しい翻訳APIエンドポイントを追加します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label htmlFor="name">API名</Label>
                <Input
                  id="name"
                  value={newApi.name}
                  onChange={(e) => setNewApi((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例: DeepL"
                  disabled={createApiMutation.isPending}
                />
                <Label htmlFor="url">API URL</Label>
                <Input
                  id="url"
                  value={newApi.url}
                  onChange={(e) => setNewApi((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://api.example.com/translate"
                  disabled={createApiMutation.isPending}
                />
                <Label htmlFor="priority">優先度</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  value={String(newApi.priority)}
                  onChange={(e) => setNewApi((prev) => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                  className="w-20"
                  disabled={createApiMutation.isPending}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newApi.isActive}
                    onCheckedChange={(checked) => setNewApi((prev) => ({ ...prev, isActive: checked }))}
                    disabled={createApiMutation.isPending}
                  />
                  <span>有効</span>
                </div>
                <Button onClick={handleCreateApi} disabled={createApiMutation.isPending}>
                  <Plus className="w-4 h-4 mr-2" />
                  API追加
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing APIs */}
          <Card>
            <CardHeader>
              <CardTitle>登録済み翻訳API</CardTitle>
              <CardDescription>
                システムは優先度順にAPIを試行し、エラーが発生した場合は次のAPIにフォールバックします。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apisLoading ? (
                <div>読み込み中...</div>
              ) : apis.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  登録されたAPIがありません
                </div>
              ) : (
                <div className="space-y-4">
                  {apis
                    .sort((a, b) => (a.priority || 1) - (b.priority || 1))
                    .map((api) => (
                      <div
                        key={api.id}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={api.isActive ? "default" : "secondary"}>
                              優先度: {api.priority}
                            </Badge>
                            <h3 className="font-semibold">{api.name}</h3>
                            {!api.isActive && (
                              <Badge variant="outline">無効</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={Boolean(api.isActive)}
                              onCheckedChange={() => handleToggleActive(api)}
                              disabled={updateApiMutation.isPending}
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteApi(api.id)}
                              disabled={deleteApiMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            URL: <code className="bg-gray-100 px-1 rounded">{api.url}</code>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span>成功: {api.successCount || 0}回</span>
                            <span>エラー: {api.errorCount || 0}回</span>
                            {api.lastUsed && (
                              <span>最終使用: {new Date(api.lastUsed).toLocaleString('ja-JP')}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`priority-${api.id}`} className="text-sm">
                              優先度:
                            </Label>
                            <Input
                              id={`priority-${api.id}`}
                              type="number"
                              min="1"
                              value={String(api.priority || 1)}
                              onChange={(e) => {
                                const newPriority = parseInt(e.target.value) || 1;
                                handlePriorityChange(api, newPriority);
                              }}
                              className="w-20"
                              disabled={updateApiMutation.isPending}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      {tab === 'users' && (
        <AdminUsers />
      )}
    </div>
  );
}