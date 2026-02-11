'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RenditionStatusBadge } from './rendition-status-badge';
import type { Rendition, FirmRendition, CalculationResult } from '@/lib/validations/rendition';

interface Props {
  data: (Rendition | FirmRendition)[];
  clientId?: string;
  locationId?: string;
  showLocation?: boolean;
}

function formatCurrency(amount: number) {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

export function RenditionsTable({ data, clientId, locationId, showLocation = false }: Props) {
  const router = useRouter();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No renditions yet.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tax Year</TableHead>
            {showLocation && <TableHead>Client / Location</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Original Cost</TableHead>
            <TableHead className="text-right">Depreciated Value</TableHead>
            <TableHead className="text-right">Assets</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => {
            const calc = r.calculatedTotals as CalculationResult | null;
            const firm = r as FirmRendition;
            const cId = clientId ?? firm.clientId;
            const lId = locationId ?? r.locationId;

            return (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => router.push(`/clients/${cId}/locations/${lId}/renditions/${r.id}`)}
              >
                <TableCell>
                  <Link
                    href={`/clients/${cId}/locations/${lId}/renditions/${r.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.taxYear}
                  </Link>
                </TableCell>
                {showLocation && (
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{firm.companyName}</span>
                      <span className="text-muted-foreground"> / {firm.locationName}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <RenditionStatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right">
                  {calc ? formatCurrency(calc.grandTotalOriginalCost) : '--'}
                </TableCell>
                <TableCell className="text-right">
                  {calc ? formatCurrency(calc.grandTotalDepreciatedValue) : '--'}
                </TableCell>
                <TableCell className="text-right">
                  {calc?.totalAssetCount ?? '--'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
