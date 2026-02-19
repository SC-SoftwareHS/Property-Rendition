'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FirmProfile } from '@/components/settings/firm-profile';
import { UserManagement } from '@/components/settings/user-management';
import { BillingTab } from '@/components/settings/billing-tab';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your firm profile and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="users">
            Users
          </TabsTrigger>
          <TabsTrigger value="billing">
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <FirmProfile />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
