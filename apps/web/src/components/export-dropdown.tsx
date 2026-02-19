'use client';

import { Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportDropdownProps {
  onExport: (format: 'csv' | 'xlsx' | 'json') => void;
  isPending?: boolean;
  label?: string;
}

export function ExportDropdown({ onExport, isPending, label = 'Export' }: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <Download className="mr-2 h-4 w-4" />
          {isPending ? 'Exporting...' : label}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport('csv')}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('xlsx')}>
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('json')}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
