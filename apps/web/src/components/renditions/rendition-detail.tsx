'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DollarSign, Package, TrendingDown, FileText, Download, RefreshCw, ArrowRight, ShieldCheck, AlertTriangle, Pencil, X, Check } from 'lucide-react';
import { RenditionStatusBadge } from './rendition-status-badge';
import {
  useRecalculateRendition,
  useUpdateRenditionStatus,
  useGeneratePdf,
  useDownloadPdf,
  useDownloadDepreciationSchedule,
  useUpdateHb9Settings,
  useUpdateFmvOverrides,
  useRemoveFmvOverride,
} from '@/hooks/use-renditions';
import type { Rendition, CalculationResult, AssetCalculation, RenditionStatus } from '@/lib/validations/rendition';
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
  const downloadSchedule = useDownloadDepreciationSchedule();
  const updateHb9 = useUpdateHb9Settings();
  const updateFmvOverrides = useUpdateFmvOverrides();
  const removeFmvOverride = useRemoveFmvOverride();

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [showAssets, setShowAssets] = useState(false);

  const statusAction = STATUS_ACTIONS[rendition.status];
  const showHb9 = calc?.hb9 && calc.state === 'TX' && calc.taxYear >= 2026;
  const canEditOverrides = rendition.status !== 'filed';
  const overrides = rendition.fmvOverrides ?? {};

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

  async function handleDownloadSchedule() {
    try {
      await downloadSchedule.mutateAsync({ clientId, locationId, renditionId: rendition.id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Schedule download failed');
    }
  }

  async function handleHb9Toggle(field: 'hasRelatedEntities' | 'electNotToRender', value: boolean) {
    try {
      await updateHb9.mutateAsync({
        clientId,
        locationId,
        renditionId: rendition.id,
        [field]: value,
      });
      toast.success('HB 9 settings updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update HB 9 settings');
    }
  }

  function startOverrideEdit(asset: AssetCalculation) {
    setEditingAssetId(asset.assetId);
    setOverrideValue(
      asset.isOverridden && asset.overrideValue != null
        ? String(asset.overrideValue)
        : String(Math.round(asset.depreciatedValue)),
    );
    setOverrideReason(
      overrides[asset.assetId]?.reason ?? '',
    );
  }

  function cancelOverrideEdit() {
    setEditingAssetId(null);
    setOverrideValue('');
    setOverrideReason('');
  }

  async function handleSaveOverride(assetId: string) {
    const value = parseFloat(overrideValue);
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }
    if (!overrideReason.trim()) {
      toast.error('Please provide a reason for the override');
      return;
    }
    try {
      await updateFmvOverrides.mutateAsync({
        clientId,
        locationId,
        renditionId: rendition.id,
        overrides: [{ assetId, overrideValue: value, reason: overrideReason.trim() }],
      });
      toast.success('FMV override saved');
      cancelOverrideEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save override');
    }
  }

  async function handleRemoveOverride(assetId: string) {
    try {
      await removeFmvOverride.mutateAsync({
        clientId,
        locationId,
        renditionId: rendition.id,
        assetId,
      });
      toast.success('FMV override removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove override');
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
            <>
              <Button
                size="sm"
                onClick={handleGeneratePdf}
                disabled={generatePdf.isPending}
              >
                <FileText className="mr-1 h-4 w-4" />
                {generatePdf.isPending
                  ? 'Generating...'
                  : rendition.hb9ElectNotToRender
                    ? 'Generate Certification'
                    : 'Generate PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSchedule}
                disabled={downloadSchedule.isPending}
              >
                <FileText className="mr-1 h-4 w-4" />
                Preview Schedule
              </Button>
            </>
          )}
          {rendition.status === 'filed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloadPdf.isPending}
              >
                <Download className="mr-1 h-4 w-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSchedule}
                disabled={downloadSchedule.isPending}
              >
                <FileText className="mr-1 h-4 w-4" />
                Download Schedule
              </Button>
            </>
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

          {/* HB 9 Exemption Card (TX only, 2026+) */}
          {showHb9 && calc.hb9 && (
            <Card className={calc.hb9.isExempt ? 'border-green-200 bg-green-50/50' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {calc.hb9.isExempt ? (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  HB 9 Exemption ($125,000)
                  {calc.hb9.isExempt ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 ml-2">
                      Exempt
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 ml-2">
                      Exceeds Threshold
                    </Badge>
                  )}
                  {rendition.hb9ElectNotToRender && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 ml-1">
                      Not Rendering
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Appraised Value</p>
                    <p className="font-semibold">{formatCurrency(calc.grandTotalDepreciatedValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exemption</p>
                    <p className="font-semibold">-{formatCurrency(calc.hb9.exemptionAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Taxable Value</p>
                    <p className="font-semibold">{formatCurrency(calc.hb9.netTaxableValue)}</p>
                  </div>
                </div>

                {rendition.status !== 'filed' && (
                  <div className="border-t pt-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rendition.hb9HasRelatedEntities}
                        onChange={(e) => handleHb9Toggle('hasRelatedEntities', e.target.checked)}
                        disabled={updateHb9.isPending}
                        className="rounded border-gray-300"
                      />
                      <span>Has related business entities at this address</span>
                    </label>
                    {calc.hb9.isExempt && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rendition.hb9ElectNotToRender}
                          onChange={(e) => handleHb9Toggle('electNotToRender', e.target.checked)}
                          disabled={updateHb9.isPending}
                          className="rounded border-gray-300"
                        />
                        <span>Elect not to render (one-time certification for under-$125K)</span>
                      </label>
                    )}
                    {rendition.hb9HasRelatedEntities && (
                      <p className="text-xs text-amber-600">
                        Related entities at the same address are aggregated for the $125K threshold.
                        All BPP in the appraisal district must be rendered if any location exceeds $125K.
                      </p>
                    )}
                    {rendition.hb9ElectNotToRender && (
                      <p className="text-xs text-blue-600">
                        You have elected not to render. A certification letter will be generated instead
                        of Form 50-144. This letter is kept on file and not submitted to the appraisal district.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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

          {/* Asset-level detail with FMV overrides */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Asset Detail</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssets(!showAssets)}
                >
                  {showAssets ? 'Hide Assets' : 'Show Assets'}
                </Button>
              </div>
              {Object.keys(overrides).length > 0 && (
                <p className="text-sm text-amber-600">
                  {Object.keys(overrides).length} FMV override{Object.keys(overrides).length !== 1 ? 's' : ''} applied
                </p>
              )}
            </CardHeader>
            {showAssets && calc.assets && (
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-3 py-2 font-medium">Description</th>
                        <th className="text-left px-3 py-2 font-medium">Category</th>
                        <th className="text-right px-3 py-2 font-medium">Year</th>
                        <th className="text-right px-3 py-2 font-medium">Cost</th>
                        <th className="text-right px-3 py-2 font-medium">% Good</th>
                        <th className="text-right px-3 py-2 font-medium">FMV</th>
                        {canEditOverrides && (
                          <th className="text-center px-3 py-2 font-medium w-24">Override</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {calc.assets.map((asset) => {
                        const isEditing = editingAssetId === asset.assetId;
                        const hasOverride = !!overrides[asset.assetId];

                        return (
                          <tr
                            key={asset.assetId}
                            className={`border-t ${hasOverride ? 'bg-amber-50' : ''}`}
                          >
                            <td className="px-3 py-2">
                              <span className="truncate max-w-[200px] block" title={asset.description}>
                                {asset.description}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {CATEGORY_LABELS[asset.category] ?? asset.category}
                            </td>
                            <td className="text-right px-3 py-2">{asset.acquisitionYear}</td>
                            <td className="text-right px-3 py-2">{formatCurrency(asset.originalCost)}</td>
                            <td className="text-right px-3 py-2">{asset.percentGood}%</td>
                            <td className="text-right px-3 py-2">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={overrideValue}
                                    onChange={(e) => setOverrideValue(e.target.value)}
                                    className="h-7 w-28 text-right ml-auto"
                                    placeholder="FMV"
                                  />
                                  <Input
                                    type="text"
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    className="h-7 w-28 text-xs ml-auto"
                                    placeholder="Reason"
                                  />
                                </div>
                              ) : (
                                <span>
                                  {formatCurrency(asset.depreciatedValue)}
                                  {hasOverride && (
                                    <Badge variant="outline" className="ml-1 text-xs bg-amber-100 text-amber-700">
                                      Override
                                    </Badge>
                                  )}
                                </span>
                              )}
                            </td>
                            {canEditOverrides && (
                              <td className="text-center px-3 py-2">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleSaveOverride(asset.assetId)}
                                      disabled={updateFmvOverrides.isPending}
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={cancelOverrideEdit}
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => startOverrideEdit(asset)}
                                      title="Override FMV"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {hasOverride && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleRemoveOverride(asset.assetId)}
                                        disabled={removeFmvOverride.isPending}
                                        title="Remove override"
                                      >
                                        <X className="h-3.5 w-3.5 text-red-500" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
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
