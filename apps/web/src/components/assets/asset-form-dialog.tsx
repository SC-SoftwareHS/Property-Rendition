'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateAsset, useUpdateAsset } from '@/hooks/use-assets';
import { assetSchema, ASSET_CATEGORIES, type AssetFormValues, type Asset } from '@/lib/validations/asset';

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  locationId: string;
  asset?: Asset | null;
}

export function AssetFormDialog({
  open,
  onOpenChange,
  clientId,
  locationId,
  asset,
}: AssetFormDialogProps) {
  const isEditing = !!asset;
  const createAsset = useCreateAsset(clientId, locationId);
  const updateAsset = useUpdateAsset(clientId, locationId);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      description: '',
      category: 'other',
      originalCost: '',
      acquisitionDate: '',
      disposalDate: '',
      quantity: 1,
      isLeased: false,
      lessorName: '',
      lessorAddress: '',
      notes: '',
    },
  });

  const watchIsLeased = form.watch('isLeased');

  useEffect(() => {
    if (asset) {
      form.reset({
        description: asset.description,
        category: asset.category as AssetFormValues['category'],
        originalCost: asset.originalCost,
        acquisitionDate: asset.acquisitionDate,
        disposalDate: asset.disposalDate ?? '',
        quantity: asset.quantity,
        isLeased: asset.isLeased,
        lessorName: asset.lessorName ?? '',
        lessorAddress: asset.lessorAddress ?? '',
        notes: asset.notes ?? '',
      });
    } else {
      form.reset({
        description: '',
        category: 'other',
        originalCost: '',
        acquisitionDate: '',
        disposalDate: '',
        quantity: 1,
        isLeased: false,
        lessorName: '',
        lessorAddress: '',
        notes: '',
      });
    }
  }, [asset, form]);

  async function onSubmit(values: AssetFormValues) {
    const cleaned = {
      ...values,
      disposalDate: values.disposalDate || undefined,
      lessorName: values.lessorName || undefined,
      lessorAddress: values.lessorAddress || undefined,
      notes: values.notes || undefined,
    };

    try {
      if (isEditing) {
        await updateAsset.mutateAsync({ id: asset.id, data: cleaned });
        toast.success('Asset updated');
      } else {
        await createAsset.mutateAsync(cleaned);
        toast.success('Asset created');
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? 'Failed to update asset' : 'Failed to create asset');
    }
  }

  const isPending = createAsset.isPending || updateAsset.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Asset' : 'New Asset'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update asset details.' : 'Add a new asset to this location.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input placeholder="Dell OptiPlex Desktop Computer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ASSET_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Cost *</FormLabel>
                    <FormControl>
                      <Input placeholder="15000.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="acquisitionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acquisition Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disposalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disposal Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isLeased"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-input"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">This asset is leased</FormLabel>
                </FormItem>
              )}
            />

            {watchIsLeased && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lessorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lessor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Leasing Company LLC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lessorAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lessor Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Lease St, City, ST" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Asset'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
