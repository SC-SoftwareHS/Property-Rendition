'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3002';

const MAPPING_FIELDS = [
  { key: 'description', label: 'Description', required: true },
  { key: 'category', label: 'Category', required: false },
  { key: 'originalCost', label: 'Original Cost', required: true },
  { key: 'acquisitionDate', label: 'Acquisition Date', required: true },
  { key: 'disposalDate', label: 'Disposal Date', required: false },
  { key: 'quantity', label: 'Quantity', required: false },
  { key: 'isLeased', label: 'Is Leased', required: false },
  { key: 'lessorName', label: 'Lessor Name', required: false },
  { key: 'lessorAddress', label: 'Lessor Address', required: false },
  { key: 'notes', label: 'Notes', required: false },
] as const;

interface ParseResponse {
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
  suggestedMapping: Record<string, string>;
}

interface ImportResult {
  inserted: number;
  errors: { row: number; field: string; message: string }[];
  total: number;
  message: string;
}

interface ImportWizardProps {
  clientId: string;
  locationId: string;
  onComplete: () => void;
}

export function ImportWizard({ clientId, locationId, onComplete }: ImportWizardProps) {
  const { getToken } = useAuth();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_URL}/import/parse`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to parse file');
      }

      const result: ParseResponse = await res.json();
      setParseResult(result);
      setMapping(result.suggestedMapping);
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  const handleImport = useCallback(async () => {
    if (!file || !parseResult) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));

      const res = await fetch(
        `${API_URL}/import/execute/${clientId}/${locationId}`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Import failed');
      }

      const result: ImportResult = await res.json();
      setImportResult(result);
      setStep(3);
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  }, [file, parseResult, mapping, clientId, locationId, getToken]);

  // Step 0: Upload
  if (step === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,.xlsx,.xls';
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleFileSelect(f);
              };
              input.click();
            }}
          >
            {isLoading ? (
              <p className="text-muted-foreground">Parsing file...</p>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  Drop a CSV or Excel file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Supports .csv, .xlsx, and .xls files up to 10MB
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <a
              href="/templates/asset-import-template.csv"
              download
              className="text-sm text-primary hover:underline"
            >
              Download CSV template
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Map Columns
  if (step === 1 && parseResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Map Columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Match your file columns to the asset fields. We auto-mapped what we could.
          </p>

          <div className="grid gap-3">
            {MAPPING_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-4">
                <label className="w-40 text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </label>
                <Select
                  value={mapping[field.key] ?? '__none__'}
                  onValueChange={(val) =>
                    setMapping((m) => ({
                      ...m,
                      [field.key]: val === '__none__' ? '' : val,
                    }))
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Skip --</SelectItem>
                    {parseResult.headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Preview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Preview
  if (step === 2 && parseResult) {
    const previewRows = parseResult.preview.map((row) => ({
      description: mapping.description ? row[mapping.description] : '',
      category: mapping.category ? row[mapping.category] : '',
      originalCost: mapping.originalCost ? row[mapping.originalCost] : '',
      acquisitionDate: mapping.acquisitionDate ? row[mapping.acquisitionDate] : '',
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{file?.name}</span>
            <Badge variant="secondary">{parseResult.totalRows} rows</Badge>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Acquisition Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.description || '-'}</TableCell>
                    <TableCell>{row.category || '-'}</TableCell>
                    <TableCell>{row.originalCost || '-'}</TableCell>
                    <TableCell>{row.acquisitionDate || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing first {previewRows.length} of {parseResult.totalRows} rows.
          </p>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? 'Importing...' : `Import ${parseResult.totalRows} assets`}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Results
  if (step === 3 && importResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">{importResult.message}</p>
              <p className="text-sm text-muted-foreground">
                {importResult.inserted} assets imported successfully
              </p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                {importResult.errors.length} rows had errors:
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border p-2 text-sm">
                {importResult.errors.slice(0, 20).map((err, i) => (
                  <p key={i} className="text-muted-foreground">
                    Row {err.row}: {err.field} — {err.message}
                  </p>
                ))}
                {importResult.errors.length > 20 && (
                  <p className="text-muted-foreground">
                    ... and {importResult.errors.length - 20} more
                  </p>
                )}
              </div>
            </div>
          )}

          <Button onClick={onComplete} className="w-full">
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
