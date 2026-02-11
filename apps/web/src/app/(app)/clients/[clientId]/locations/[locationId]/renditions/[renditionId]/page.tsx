'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRendition } from '@/hooks/use-renditions';
import { RenditionDetail } from '@/components/renditions/rendition-detail';

export default function RenditionDetailPage() {
  const params = useParams<{
    clientId: string;
    locationId: string;
    renditionId: string;
  }>();
  const router = useRouter();
  const { clientId, locationId, renditionId } = params;

  const { data: rendition, isLoading } = useRendition(clientId, locationId, renditionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading rendition...
      </div>
    );
  }

  if (!rendition) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Rendition not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/clients/${clientId}/locations/${locationId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Rendition Detail</h1>
      </div>

      <RenditionDetail
        rendition={rendition}
        clientId={clientId}
        locationId={locationId}
      />
    </div>
  );
}
