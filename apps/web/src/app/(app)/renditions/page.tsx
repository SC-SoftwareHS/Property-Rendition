'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useFirmRenditions } from '@/hooks/use-renditions';
import { RenditionsTable } from '@/components/renditions/renditions-table';
import type { RenditionStatus } from '@/lib/validations/rendition';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'filed', label: 'Filed' },
];

export default function RenditionsPage() {
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useFirmRenditions({
    taxYear,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Renditions</h1>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tax Year:</span>
          <Input
            type="number"
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value, 10))}
            className="w-24"
            min={2000}
            max={2100}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading renditions...
        </div>
      ) : (
        <RenditionsTable data={data ?? []} showLocation />
      )}
    </div>
  );
}
