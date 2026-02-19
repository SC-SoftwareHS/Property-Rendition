'use client';

import { useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/hooks/use-clients';
import { useExportClients } from '@/hooks/use-export';
import { ClientsTable } from './clients-table';
import { ClientFormDialog } from './client-form-dialog';
import { ExportDropdown } from '@/components/export-dropdown';
import type { Client } from '@/lib/validations/client';

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { exportClients, isPending: isExporting } = useExportClients();

  const limit = 25;
  const { data, isLoading } = useClients({
    search: debouncedSearch || undefined,
    limit,
    offset: page * limit,
  });

  // Simple debounce via timeout
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
    const timeout = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timeout);
  }, []);

  function handleEdit(client: Client) {
    setEditingClient(client);
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingClient(null);
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client companies and contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportDropdown
            onExport={(fmt) => {
              exportClients(fmt);
              toast.info('Exporting clients...');
            }}
            isPending={isExporting}
          />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} client{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading clients...</p>
        </div>
      ) : (
        <>
          <ClientsTable data={data?.data ?? []} onEdit={handleEdit} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        client={editingClient}
      />
    </div>
  );
}
