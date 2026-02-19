'use client';

import { useState } from 'react';
import { FileText, Download, ChevronDown, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useFirmRenditions,
  useBatchGenerate,
  useBatchGenerateZip,
  useRollover,
  useRolloverStatus,
} from '@/hooks/use-renditions';
import { useExportRenditions } from '@/hooks/use-export';
import { ExportDropdown } from '@/components/export-dropdown';
import { RenditionsTable } from '@/components/renditions/renditions-table';

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

  const batchGenerate = useBatchGenerate();
  const batchGenerateZip = useBatchGenerateZip();
  const rollover = useRollover();
  const { exportRenditions, isPending: isExporting } = useExportRenditions();
  const nextYear = taxYear + 1;
  const { data: rolloverStatus } = useRolloverStatus(nextYear);

  const approvedCount = data?.filter((r) => r.status === 'approved').length ?? 0;

  const handleBatchGenerate = () => {
    batchGenerate.mutate(
      { taxYear },
      {
        onSuccess: (result) => {
          if (result.failed === 0) {
            toast.success(
              `Generated ${result.success} PDF${result.success !== 1 ? 's' : ''} and marked as filed.`,
            );
          } else {
            toast.warning(
              `Generated ${result.success} of ${result.total}. ${result.failed} failed.`,
            );
          }
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Batch generation failed');
        },
      },
    );
  };

  const handleBatchZip = () => {
    toast.info('Generating PDFs and creating ZIP...');
    batchGenerateZip.mutate(
      { taxYear },
      {
        onSuccess: () => {
          toast.success('ZIP downloaded successfully.');
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'ZIP generation failed');
        },
      },
    );
  };

  const handleRollover = () => {
    rollover.mutate(
      { fromYear: taxYear, toYear: nextYear },
      {
        onSuccess: (result) => {
          toast.success(
            `Rolled ${result.snapshotsCreated} assets to ${nextYear}. Created ${result.renditionsCreated} renditions across ${result.locationsProcessed} locations.`,
          );
          setTaxYear(nextYear);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Rollover failed');
        },
      },
    );
  };

  const isBatchLoading = batchGenerate.isPending || batchGenerateZip.isPending;
  const alreadyRolled = rolloverStatus?.rolledOver ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Renditions</h1>
        </div>

        <div className="flex items-center gap-2">
          <ExportDropdown
            onExport={(fmt) => {
              exportRenditions(fmt, { taxYear });
              toast.info('Exporting renditions...');
            }}
            isPending={isExporting}
          />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={rollover.isPending || alreadyRolled}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {rollover.isPending
                  ? 'Rolling...'
                  : alreadyRolled
                    ? `${nextYear} Already Rolled`
                    : `Roll to ${nextYear}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Roll assets to {nextYear}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will snapshot all current assets for tax year {nextYear} and
                  create new renditions (status: not started) for each location.
                  Asset data will be frozen — editing assets after rollover won&apos;t
                  change {taxYear} renditions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRollover}>
                  Roll to {nextYear}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {approvedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isBatchLoading}>
                  <Download className="mr-2 h-4 w-4" />
                  {isBatchLoading ? 'Generating...' : `Batch Generate (${approvedCount})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBatchGenerate}>
                  Generate & File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBatchZip}>
                  Generate & Download ZIP
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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
