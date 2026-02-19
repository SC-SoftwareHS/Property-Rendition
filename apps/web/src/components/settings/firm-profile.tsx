'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Building2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirm, useUpdateFirm } from '@/hooks/use-firm';
import type { UpdateFirmValues } from '@/hooks/use-firm';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

const TIMEZONE_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern (ET)',
  'America/Chicago': 'Central (CT)',
  'America/Denver': 'Mountain (MT)',
  'America/Los_Angeles': 'Pacific (PT)',
  'America/Anchorage': 'Alaska (AKT)',
  'Pacific/Honolulu': 'Hawaii (HST)',
};

export function FirmProfile() {
  const { data: firm, isLoading } = useFirm();
  const { mutate: updateFirm, isPending: isSaving } = useUpdateFirm();

  const [form, setForm] = useState<UpdateFirmValues>({});

  useEffect(() => {
    if (firm) {
      setForm({
        name: firm.name,
        address: firm.address ?? '',
        city: firm.city ?? '',
        state: firm.state ?? '',
        zip: firm.zip ?? '',
        phone: firm.phone ?? '',
        website: firm.website ?? '',
        defaultState: firm.defaultState ?? 'TX',
        timezone: firm.timezone ?? 'America/Chicago',
      });
    }
  }, [firm]);

  function handleChange(field: keyof UpdateFirmValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    updateFirm(form, {
      onSuccess: () => toast.success('Firm profile updated'),
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading firm profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Firm Information
          </CardTitle>
          <CardDescription>
            Basic information about your firm. This appears on generated renditions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Firm Name</Label>
              <Input
                id="name"
                value={form.name ?? ''}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={form.address ?? ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main St, Suite 200"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city ?? ''}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">State</Label>
                <Select
                  value={form.state ?? ''}
                  onValueChange={(v) => handleChange('state', v)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={form.zip ?? ''}
                  onChange={(e) => handleChange('zip', e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone ?? ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website ?? ''}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>
            Default settings for new locations and renditions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultState">Default State</Label>
              <Select
                value={form.defaultState ?? 'TX'}
                onValueChange={(v) => handleChange('defaultState', v)}
              >
                <SelectTrigger id="defaultState">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TX">Texas (TX)</SelectItem>
                  <SelectItem value="OK">Oklahoma (OK)</SelectItem>
                  <SelectItem value="FL">Florida (FL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={form.timezone ?? 'America/Chicago'}
                onValueChange={(v) => handleChange('timezone', v)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {TIMEZONE_LABELS[tz] ?? tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
