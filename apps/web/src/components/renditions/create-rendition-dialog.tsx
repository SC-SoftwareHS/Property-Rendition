'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateRendition } from '@/hooks/use-renditions';
import { useDepreciationPreview } from '@/hooks/use-depreciation';
import { CATEGORY_LABELS } from '@/lib/validations/rendition';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  locationId: string;
}

export function CreateRenditionDialog({ open, onOpenChange, clientId, locationId }: Props) {
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [showPreview, setShowPreview] = useState(false);

  const { data: preview, isLoading: previewLoading } = useDepreciationPreview(
    clientId,
    locationId,
    taxYear,
    showPreview,
  );

  const createRendition = useCreateRendition();

  function handlePreview() {
    setShowPreview(true);
  }

  async function handleCreate() {
    try {
      await createRendition.mutateAsync({ clientId, locationId, taxYear });
      toast.success(`Rendition for ${taxYear} created successfully`);
      onOpenChange(false);
      setShowPreview(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rendition');
    }
  }

  function formatCurrency(amount: number) {
    return `$${Math.round(amount).toLocaleString('en-US')}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Rendition</DialogTitle>
          <DialogDescription>
            Generate a tax rendition with depreciation calculations for this location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taxYear">Tax Year</Label>
            <Input
              id="taxYear"
              type="number"
              value={taxYear}
              onChange={(e) => {
                setTaxYear(parseInt(e.target.value, 10));
                setShowPreview(false);
              }}
              min={2000}
              max={2100}
            />
          </div>

          {!showPreview && (
            <Button variant="outline" onClick={handlePreview} className="w-full">
              Preview Depreciation
            </Button>
          )}

          {showPreview && previewLoading && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Calculating depreciation...
            </div>
          )}

          {showPreview && preview && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left px-3 py-2 font-medium">Category</th>
                    <th className="text-right px-3 py-2 font-medium">Original Cost</th>
                    <th className="text-right px-3 py-2 font-medium">Depreciated</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(preview.byCategory).map(([cat, data]) => (
                    <tr key={cat} className="border-t">
                      <td className="px-3 py-2">{CATEGORY_LABELS[cat] ?? cat}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(data.totalOriginalCost)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(data.totalDepreciatedValue)}</td>
                    </tr>
                  ))}
                  <tr className="border-t font-semibold bg-muted/50">
                    <td className="px-3 py-2">Total</td>
                    <td className="text-right px-3 py-2">{formatCurrency(preview.grandTotalOriginalCost)}</td>
                    <td className="text-right px-3 py-2">{formatCurrency(preview.grandTotalDepreciatedValue)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                {preview.totalAssetCount} assets | State: {preview.state}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={createRendition.isPending}
          >
            {createRendition.isPending ? 'Creating...' : 'Create Rendition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
