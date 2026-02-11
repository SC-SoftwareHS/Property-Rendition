'use client';

import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteLocation } from '@/hooks/use-locations';
import type { LocationWithJurisdiction } from '@/lib/validations/location';

interface LocationsTableProps {
  data: LocationWithJurisdiction[];
  clientId: string;
  onEdit: (location: LocationWithJurisdiction) => void;
}

export function LocationsTable({ data, clientId, onEdit }: LocationsTableProps) {
  const router = useRouter();
  const deleteLocation = useDeleteLocation(clientId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(loc: LocationWithJurisdiction) {
    setDeletingId(loc.location.id);
    try {
      await deleteLocation.mutateAsync(loc.location.id);
      toast.success(`"${loc.location.name}" deleted`);
    } catch {
      toast.error('Failed to delete location');
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnDef<LocationWithJurisdiction>[] = [
    {
      id: 'name',
      header: 'Location',
      cell: ({ row }) => (
        <Link
          href={`/clients/${clientId}/locations/${row.original.location.id}`}
          className="font-medium hover:underline"
        >
          {row.original.location.name}
        </Link>
      ),
    },
    {
      id: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const loc = row.original.location;
        const parts = [loc.city, loc.state].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : '-';
      },
    },
    {
      id: 'county',
      header: 'County',
      cell: ({ row }) => row.original.location.county ?? '-',
    },
    {
      id: 'jurisdiction',
      header: 'Jurisdiction',
      cell: ({ row }) =>
        row.original.jurisdiction ? (
          <Badge variant="secondary">
            <MapPin className="mr-1 h-3 w-3" />
            {row.original.jurisdiction.appraisalDistrictName}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Not resolved</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const loc = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(loc)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                disabled={deletingId === loc.location.id}
                onClick={() => handleDelete(loc)}
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
                onClick={() => router.push(`/clients/${clientId}/locations/${row.original.location.id}`)}
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
                No locations yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
