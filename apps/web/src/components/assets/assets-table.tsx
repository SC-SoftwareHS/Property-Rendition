'use client';

import { useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateAsset, useDeleteAsset } from '@/hooks/use-assets';
import { ASSET_CATEGORIES, type Asset } from '@/lib/validations/asset';

const categoryMap = Object.fromEntries(
  ASSET_CATEGORIES.map((c) => [c.value, c.label]),
);

interface AssetsTableProps {
  data: Asset[];
  clientId: string;
  locationId: string;
  onEdit: (asset: Asset) => void;
}

interface EditingCell {
  assetId: string;
  field: 'description' | 'originalCost';
  value: string;
}

export function AssetsTable({ data, clientId, locationId, onEdit }: AssetsTableProps) {
  const updateAsset = useUpdateAsset(clientId, locationId);
  const deleteAsset = useDeleteAsset(clientId, locationId);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const startEditing = useCallback((assetId: string, field: 'description' | 'originalCost', value: string) => {
    setEditingCell({ assetId, field, value });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const saveEditing = useCallback(async () => {
    if (!editingCell) return;

    try {
      await updateAsset.mutateAsync({
        id: editingCell.assetId,
        data: { [editingCell.field]: editingCell.value },
      });
      toast.success('Asset updated');
    } catch {
      toast.error('Failed to update');
    }
    setEditingCell(null);
  }, [editingCell, updateAsset]);

  async function handleDelete(asset: Asset) {
    setDeletingId(asset.id);
    try {
      await deleteAsset.mutateAsync(asset.id);
      toast.success('Asset deleted');
    } catch {
      toast.error('Failed to delete asset');
    } finally {
      setDeletingId(null);
    }
  }

  function formatCurrency(value: string) {
    const num = parseFloat(value);
    return isNaN(num) ? value : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const columns: ColumnDef<Asset>[] = [
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const asset = row.original;
        if (editingCell?.assetId === asset.id && editingCell.field === 'description') {
          return (
            <div className="flex items-center gap-1">
              <Input
                value={editingCell.value}
                onChange={(e) =>
                  setEditingCell({ ...editingCell, value: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditing();
                  if (e.key === 'Escape') cancelEditing();
                }}
                className="h-7 text-sm"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEditing}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEditing}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        return (
          <span
            className="cursor-pointer hover:underline"
            onDoubleClick={() => startEditing(asset.id, 'description', asset.description)}
          >
            {asset.description}
          </span>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {categoryMap[row.original.category] ?? row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: 'originalCost',
      header: 'Cost',
      cell: ({ row }) => {
        const asset = row.original;
        if (editingCell?.assetId === asset.id && editingCell.field === 'originalCost') {
          return (
            <div className="flex items-center gap-1">
              <Input
                value={editingCell.value}
                onChange={(e) =>
                  setEditingCell({ ...editingCell, value: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditing();
                  if (e.key === 'Escape') cancelEditing();
                }}
                className="h-7 w-28 text-sm"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEditing}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEditing}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        return (
          <span
            className="cursor-pointer font-mono hover:underline"
            onDoubleClick={() => startEditing(asset.id, 'originalCost', asset.originalCost)}
          >
            {formatCurrency(asset.originalCost)}
          </span>
        );
      },
    },
    {
      accessorKey: 'acquisitionDate',
      header: 'Acquired',
      cell: ({ row }) => row.original.acquisitionDate,
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: ({ row }) => row.original.quantity,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(asset)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                disabled={deletingId === asset.id}
                onClick={() => handleDelete(asset)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No assets yet. Add one to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
