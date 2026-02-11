'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Package, TrendingDown, FileText, Download, RefreshCw, ArrowRight } from 'lucide-react';
import { RenditionStatusBadge } from './rendition-status-badge';
import {
  useRecalculateRendition,
  useUpdateRenditionStatus,
  useGeneratePdf,
  useDownloadPdf,
} from '@/hooks/use-renditions';
import type { Rendition, CalculationResult, RenditionStatus } from '@/lib/validations/rendition';
import { CATEGORY_LABELS } from '@/lib/validations/rendition';
import { toast } from 'sonner';

interface Props {
  rendition: Rendition;
  clientId: string;
  locationId: string;
}

function formatCurrency(amount: number) {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

const STATUS_ACTIONS: Record<RenditionStatus, { label: string; nextStatus: string } | null> = {
  not_started: null,
  in_progress: { label: 'Submit for Review', nextStatus: 'review' },
  review: { label: 'Approve', nextStatus: 'approved' },
  approved: null, // PDF generation handles transition to filed
  filed: null,
};

export function RenditionDetail({ rendition, clientId, locationId }: Props) {
  const calc = rendition.calculatedTotals as CalculationResult | null;
  const recalculate = useRecalculateRendition();
  const updateStatus = useUpdateRenditionStatus();
  const generatePdf = useGeneratePdf();
  const downloadPdf = useDownloadPdf();

  const statusAction = STATUS_ACTIONS[rendition.status];

  async function handleRecalculate() {
    try {
      await recalculate.mutateAsync({ clientId, locationId, renditionId: rendition.id });
      toast.success('Rendition recalculated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recalculation failed');
    }
  }

  async function handleStatusChange() {
    if (!statusAction) return;
    try {
      await updateStatus.mutateAsync({
        clientId,
        locationId,
        renditionId: rendition.id,
        status: statusAction.nextStatus,
      });
      toast.success(`Status updated to "${statusAction.nextStatus}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    }
  }

  async function handleGeneratePdf() {
    try {
      const result = await generatePdf.mutateAsync({ clientId, locationId, renditionId: rendition.id });
      toast.success(`PDF generated: ${result.filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF generation failed');
    }
  }

  async function handleDownloadPdf() {
    try {
      await downloadPdf.mutateAsync({ clientId, locationId, renditionId: rendition.id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Tax Year {rendition.taxYear}</h2>
          <RenditionStatusBadge status={rendition.status} />
        </div>
        <div className="flex items-center gap-2">
          {rendition.status !== 'filed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculate.isPending}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Recalculate
            </Button>
          )}
          {statusAction && (
            <Button
              size="sm"
              onClick={handleStatusChange}
              disabled={updateStatus.isPending}
            >
              {statusAction.label}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {rendition.status === 'approved' && (
            <Button
              size="sm"
              onClick={handleGeneratePdf}
              disabled={generatePdf.isPending}
            >
              <FileText className="mr-1 h-4 w-4" />
              {generatePdf.isPending ? 'Generating...' : 'Generate PDF'}
            </Button>
          )}
          {rendition.status === 'filed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloadPdf.isPending}
            >
              <Download className="mr-1 h-4 w-4" />
              Download PDF
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {calc && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(calc.grandTotalOriginalCost)}</p>
                  <p className="text-sm text-muted-foreground">Original Cost</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <TrendingDown className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(calc.grandTotalDepreciatedValue)}</p>
                  <p className="text-sm text-muted-foreground">Depreciated Value</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Package className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{calc.totalAssetCount}</p>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left px-3 py-2 font-medium">Category</th>
                      <th className="text-right px-3 py-2 font-medium">Assets</th>
                      <th className="text-right px-3 py-2 font-medium">Original Cost</th>
                      <th className="text-right px-3 py-2 font-medium">Depreciated Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(calc.byCategory)
                      .sort(([, a], [, b]) => b.totalDepreciatedValue - a.totalDepreciatedValue)
                      .map(([cat, data]) => (
                        <tr key={cat} className="border-t">
                          <td className="px-3 py-2">{CATEGORY_LABELS[cat] ?? cat}</td>
                          <td className="text-right px-3 py-2">{data.assetCount}</td>
                          <td className="text-right px-3 py-2">{formatCurrency(data.totalOriginalCost)}</td>
                          <td className="text-right px-3 py-2">{formatCurrency(data.totalDepreciatedValue)}</td>
                        </tr>
                      ))}
                    <tr className="border-t font-semibold bg-muted/50">
                      <td className="px-3 py-2">Total</td>
                      <td className="text-right px-3 py-2">{calc.totalAssetCount}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(calc.grandTotalOriginalCost)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(calc.grandTotalDepreciatedValue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!calc && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          No calculation data available. Click Recalculate to generate.
        </div>
      )}
    </div>
  );
}
