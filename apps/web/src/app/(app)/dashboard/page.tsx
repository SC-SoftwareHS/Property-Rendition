'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, MapPin, Package, FileText, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/validations/rendition';
import { cn } from '@/lib/utils';

const STATUS_ORDER = ['not_started', 'in_progress', 'review', 'approved', 'filed'] as const;

export default function Dashboard() {
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear);
  const { data: stats, isLoading } = useDashboardStats(taxYear);

  const totalRenditions = stats
    ? Object.values(stats.renditionsByStatus).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTaxYear((y) => y - 1)}
            disabled={taxYear <= 2000}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{taxYear}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTaxYear((y) => y + 1)}
            disabled={taxYear >= 2100}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : stats?.clientCount ?? 0}
            </div>
            <Link
              href="/clients"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              View all clients
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : stats?.locationCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : stats?.assetCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total tracked assets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Renditions ({taxYear})
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : totalRenditions}
            </div>
            <Link
              href="/renditions"
              className="text-xs text-muted-foreground hover:text-primary"
            >
              View all renditions
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Renditions by Status */}
      {stats && totalRenditions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rendition Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = stats.renditionsByStatus[status] ?? 0;
                const pct = totalRenditions > 0 ? (count / totalRenditions) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={cn('w-24 justify-center font-medium', STATUS_COLORS[status])}
                    >
                      {STATUS_LABELS[status]}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', getBarColor(status))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {stats && stats.upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Filing Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.upcomingDeadlines.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{d.county}, {d.state}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({d.locationCount} {d.locationCount === 1 ? 'location' : 'locations'})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{d.deadline}</span>
                    <Badge variant={d.daysLeft <= 30 ? 'destructive' : d.daysLeft <= 60 ? 'default' : 'secondary'}>
                      {d.daysLeft <= 0 ? 'Past due' : `${d.daysLeft}d left`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/clients">
              <Users className="mr-2 h-4 w-4" />
              Manage Clients
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/renditions">
              <FileText className="mr-2 h-4 w-4" />
              View Renditions
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function getBarColor(status: string): string {
  switch (status) {
    case 'not_started': return 'bg-gray-400';
    case 'in_progress': return 'bg-blue-500';
    case 'review': return 'bg-yellow-500';
    case 'approved': return 'bg-green-500';
    case 'filed': return 'bg-purple-500';
    default: return 'bg-gray-400';
  }
}
