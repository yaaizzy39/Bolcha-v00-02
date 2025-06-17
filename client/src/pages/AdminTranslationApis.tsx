import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';

interface TranslationApi {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  priority: number;
}

export default function AdminTranslationApis() {
  const [apis, setApis] = useState<TranslationApi[]>([]);
  const [newApi, setNewApi] = useState({ name: '', url: '', priority: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApis = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/translation-apis', { credentials: 'include' });
      const data = await res.json();
      setApis(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const handleCreate = async () => {
    if (!newApi.name || !newApi.url) return;
    try {
      await fetch('/api/admin/translation-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newApi, priority: Number(newApi.priority) }),
      });
      setNewApi({ name: '', url: '', priority: 1 });
      fetchApis();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await fetch(`/api/admin/translation-apis/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive }),
    });
    fetchApis();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/admin/translation-apis/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    fetchApis();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Translation API Settings</h1>

      {/* New API form */}
      <div className="flex gap-2 mb-6 items-end flex-wrap">
        <Input
          placeholder="Name"
          value={newApi.name}
          onChange={(e) => setNewApi({ ...newApi, name: e.target.value })}
          className="w-40"
        />
        <Input
          placeholder="URL"
          value={newApi.url}
          onChange={(e) => setNewApi({ ...newApi, url: e.target.value })}
          className="flex-1 min-w-[250px]"
        />
        <Input
          placeholder="Priority (1=high)"
          type="number"
          value={newApi.priority}
          onChange={(e) => setNewApi({ ...newApi, priority: Number(e.target.value) })}
          className="w-32"
        />
        <Button onClick={handleCreate}>Add</Button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apis.map((api) => (
              <TableRow key={api.id}>
                <TableCell>{api.id}</TableCell>
                <TableCell>{api.name}</TableCell>
                <TableCell className="truncate max-w-xs">{api.url}</TableCell>
                <TableCell>{api.priority}</TableCell>
                <TableCell>
                  <Switch
                    checked={api.isActive}
                    onCheckedChange={(val) => handleToggleActive(api.id, val)}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(api.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
