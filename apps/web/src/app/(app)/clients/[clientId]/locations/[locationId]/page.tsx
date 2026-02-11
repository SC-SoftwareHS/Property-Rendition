'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Package, DollarSign, Upload, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLocation } from '@/hooks/use-locations';
import { useAssets, useAssetSummary } from '@/hooks/use-assets';
import { useRenditions } from '@/hooks/use-renditions';
import { AssetsTable } from '@/components/assets/assets-table';
import { AssetFormDialog } from '@/components/assets/asset-form-dialog';
import { ImportWizard } from '@/components/import/import-wizard';
import { RenditionsTable } from '@/components/renditions/renditions-table';
import { CreateRenditionDialog } from '@/components/renditions/create-rendition-dialog';
import type { Asset } from '@/lib/validations/asset';

export default function LocationDetailPage() {
  const params = useParams<{ clientId: string; locationId: string }>();
  const router = useRouter();
  const { clientId, locationId } = params;

  const { data: locationData, isLoading: locationLoading } = useLocation(clientId, locationId);
  const { data: assetsData, isLoading: assetsLoading } = useAssets(clientId, locationId);
  const { data: summary } = useAssetSummary(clientId, locationId);
  const { data: renditionsData, isLoading: renditionsLoading } = useRenditions(clientId, locationId);

  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [renditionDialogOpen, setRenditionDialogOpen] = useState(false);

  function handleEdit(asset: Asset) {
    setEditingAsset(asset);
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingAsset(null);
  }

  if (locationLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  if (!locationData) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Location not found</div>;
  }

  const loc = locationData.location;
  const jurisdiction = locationData.jurisdiction;

  function formatCurrency(value: string) {
    const num = parseFloat(value);
    return isNaN(num) ? '$0.00' : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/clients/${clientId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{loc.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {[loc.city, loc.state].filter(Boolean).join(', ')}
            {jurisdiction && (
              <Badge variant="outline">{jurisdiction.appraisalDistrictName}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Package className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{summary?.totalAssets ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Assets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{formatCurrency(summary?.totalValue ?? '0')}</p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Renditions Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Renditions</h2>
          <p className="text-sm text-muted-foreground">
            Tax renditions with depreciation calculations and PDF generation.
          </p>
        </div>
        <Button onClick={() => setRenditionDialogOpen(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Generate Rendition
        </Button>
      </div>

      {renditionsLoading ? (
        <div className="flex items-center justify-center h-16 text-muted-foreground">
          Loading renditions...
        </div>
      ) : (
        <RenditionsTable
          data={renditionsData ?? []}
          clientId={clientId}
          locationId={locationId}
        />
      )}

      <CreateRenditionDialog
        open={renditionDialogOpen}
        onOpenChange={setRenditionDialogOpen}
        clientId={clientId}
        locationId={locationId}
      />

      <Separator />

      {/* Assets Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Assets</h2>
          <p className="text-sm text-muted-foreground">
            Double-click description or cost to edit inline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      {showImport && (
        <ImportWizard
          clientId={clientId}
          locationId={locationId}
          onComplete={() => {
            setShowImport(false);
            queryClient.invalidateQueries({ queryKey: ['assets', clientId, locationId] });
            queryClient.invalidateQueries({ queryKey: ['asset-summary', clientId, locationId] });
          }}
        />
      )}

      {assetsLoading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Loading assets...
        </div>
      ) : (
        <AssetsTable
          data={assetsData ?? []}
          clientId={clientId}
          locationId={locationId}
          onEdit={handleEdit}
        />
      )}

      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        clientId={clientId}
        locationId={locationId}
        asset={editingAsset}
      />
    </div>
  );
}
