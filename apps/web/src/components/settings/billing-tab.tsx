'use client';

import { CreditCard, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBilling, useCreateCheckout, useCreatePortal } from '@/hooks/use-billing';

const PLANS = [
  {
    tier: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: ['1 user', '25 clients', 'TX, OK, FL states', 'PDF generation', 'CSV/Excel export'],
  },
  {
    tier: 'professional',
    name: 'Professional',
    monthlyPrice: 79,
    yearlyPrice: 790,
    features: ['5 users', 'Unlimited clients', 'All supported states', 'Batch generation', 'Year-over-year rollover'],
  },
  {
    tier: 'firm',
    name: 'Firm',
    monthlyPrice: 149,
    yearlyPrice: 1490,
    features: ['Unlimited users', 'Unlimited clients', 'All supported states', 'Priority support', 'Custom branding (coming soon)'],
  },
];

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Free Trial',
  active: 'Active',
  past_due: 'Past Due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  trialing: 'secondary',
  active: 'default',
  past_due: 'destructive',
  canceled: 'destructive',
  unpaid: 'destructive',
};

export function BillingTab() {
  const { data: billing, isLoading } = useBilling();
  const { mutate: createCheckout, isPending: checkoutPending } = useCreateCheckout();
  const { mutate: createPortal, isPending: portalPending } = useCreatePortal();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading billing information...
      </div>
    );
  }

  const currentTier = billing?.subscriptionTier ?? 'starter';
  const billingStatus = billing?.billingStatus ?? 'trialing';

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Your subscription and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold capitalize">{currentTier}</span>
            <Badge variant={STATUS_COLORS[billingStatus] ?? 'outline'}>
              {STATUS_LABELS[billingStatus] ?? billingStatus}
            </Badge>
          </div>

          {(billingStatus === 'past_due' || billingStatus === 'canceled') && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {billingStatus === 'past_due'
                ? 'Your trial has ended. Add a payment method to continue using RenditionReady.'
                : 'Your subscription has been canceled. Resubscribe to regain access.'}
            </div>
          )}

          {billing?.stripeCustomerId && (
            <Button
              variant="outline"
              onClick={() => createPortal()}
              disabled={portalPending}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {portalPending ? 'Loading...' : 'Manage Subscription'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <Card
              key={plan.tier}
              className={isCurrent ? 'border-primary' : ''}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && <Badge>Current</Badge>}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    or ${plan.yearlyPrice}/yr
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button
                    className="w-full"
                    variant={plan.tier === 'professional' ? 'default' : 'outline'}
                    disabled={checkoutPending}
                    onClick={() =>
                      createCheckout({ tier: plan.tier, interval: 'monthly' })
                    }
                  >
                    {checkoutPending ? 'Loading...' : 'Subscribe'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
