'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS, type RenditionStatus } from '@/lib/validations/rendition';

interface Props {
  status: RenditionStatus;
}

export function RenditionStatusBadge({ status }: Props) {
  return (
    <Badge variant="secondary" className={cn('font-medium', STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
