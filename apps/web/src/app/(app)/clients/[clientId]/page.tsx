'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Building2, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClient } from '@/hooks/use-clients';
import { useLocations } from '@/hooks/use-locations';
import { LocationsTable } from '@/components/locations/locations-table';
import { LocationFormDialog } from '@/components/locations/location-form-dialog';
import type { LocationWithJurisdiction } from '@/lib/validations/location';

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const router = useRouter();
  const clientId = params.clientId;

  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const { data: locations, isLoading: locationsLoading } = useLocations(clientId);

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithJurisdiction | null>(null);

  function handleEditLocation(loc: LocationWithJurisdiction) {
    setEditingLocation(loc);
    setLocationDialogOpen(true);
  }

  function handleLocationDialogChange(open: boolean) {
    setLocationDialogOpen(open);
    if (!open) setEditingLocation(null);
  }

  if (clientLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading client...</div>;
  }

  if (!client) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Client not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/clients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.companyName}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            {client.ein && <span>EIN: {client.ein}</span>}
            {client.industry && <Badge variant="secondary">{client.industry}</Badge>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="mr-2 h-4 w-4" />
            Locations
            {locations && (
              <Badge variant="secondary" className="ml-2">
                {locations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assets">
            <Package className="mr-2 h-4 w-4" />
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{client.contactName ?? 'No contact'}</p>
                <p className="text-sm text-muted-foreground">{client.contactEmail ?? '-'}</p>
                <p className="text-sm text-muted-foreground">{client.contactPhone ?? '-'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{locations?.length ?? 0}</span> location{(locations?.length ?? 0) !== 1 ? 's' : ''}
                </p>
                {client.notes && (
                  <p className="text-sm text-muted-foreground">{client.notes}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Business locations for this client.
            </p>
            <Button onClick={() => setLocationDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </div>

          {locationsLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Loading locations...
            </div>
          ) : (
            <LocationsTable
              data={locations ?? []}
              clientId={clientId}
              onEdit={handleEditLocation}
            />
          )}
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <p className="text-muted-foreground">
            Select a location to view and manage its assets.
          </p>
          {locations && locations.length > 0 ? (
            <div className="grid gap-2">
              {locations.map((loc) => (
                <Card
                  key={loc.location.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    router.push(`/clients/${clientId}/locations/${loc.location.id}`)
                  }
                >
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{loc.location.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {[loc.location.city, loc.location.state].filter(Boolean).join(', ') || 'No address'}
                      </p>
                    </div>
                    {loc.jurisdiction && (
                      <Badge variant="outline">{loc.jurisdiction.appraisalDistrictName}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Add a location first to manage assets.</p>
          )}
        </TabsContent>
      </Tabs>

      <LocationFormDialog
        open={locationDialogOpen}
        onOpenChange={handleLocationDialogChange}
        clientId={clientId}
        location={editingLocation?.location ?? null}
      />
    </div>
  );
}
