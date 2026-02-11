'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useDeleteClient } from '@/hooks/use-clients';
import type { Client } from '@/lib/validations/client';

interface ClientsTableProps {
  data: Client[];
  onEdit: (client: Client) => void;
}

export function ClientsTable({ data, onEdit }: ClientsTableProps) {
  const router = useRouter();
  const deleteClient = useDeleteClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(client: Client) {
    setDeletingId(client.id);
    try {
      await deleteClient.mutateAsync(client.id);
      toast.success(`"${client.companyName}" deleted`);
    } catch {
      toast.error('Failed to delete client');
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: 'companyName',
      header: 'Company',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.companyName}</span>
      ),
    },
    {
      accessorKey: 'contactName',
      header: 'Contact',
      cell: ({ row }) => row.original.contactName ?? '-',
    },
    {
      accessorKey: 'contactEmail',
      header: 'Email',
      cell: ({ row }) => row.original.contactEmail ?? '-',
    },
    {
      accessorKey: 'industry',
      header: 'Industry',
      cell: ({ row }) =>
        row.original.industry ? (
          <Badge variant="secondary">{row.original.industry}</Badge>
        ) : (
          '-'
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const client = row.original;
        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(client)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                disabled={deletingId === client.id}
                onClick={() => handleDelete(client)}
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
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/clients/${row.original.id}`)}
              >
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
                No clients yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
