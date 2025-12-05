import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface BulkCustomerImportProps {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface CustomerRow {
  name: string;
  phone: string;
  email?: string;
  delivery_location?: string;
  city_corporation?: string;
  area?: string;
  sub_area?: string;
  district?: string;
  upazila?: string;
  street_address?: string;
  tags?: string;
  notes?: string;
}

interface ImportError {
  row: number;
  error: string;
}

export function BulkCustomerImport({ storeId, open, onOpenChange, onImportComplete }: BulkCustomerImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<CustomerRow[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Ahmed Khan',
        phone: '01712345678',
        email: 'ahmed@email.com',
        delivery_location: 'inside_dhaka',
        city_corporation: 'dhaka_north',
        area: 'Mirpur (Sections 1-14)',
        sub_area: 'Section 10',
        district: '',
        upazila: '',
        street_address: 'House 123, Road 4',
        tags: 'vip,regular',
        notes: 'Good customer',
      },
      {
        name: 'Rahim Uddin',
        phone: '01812345678',
        email: '',
        delivery_location: 'outside_dhaka',
        city_corporation: '',
        area: '',
        sub_area: '',
        district: 'Chattogram',
        upazila: 'Hathazari',
        street_address: 'Village Road',
        tags: 'wholesale',
        notes: 'Bulk buyer',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customer_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setPreviewData([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<CustomerRow>(worksheet);

      // Validate and preview first 5 rows
      const preview = jsonData.slice(0, 5);
      setPreviewData(preview);

      // Basic validation
      const validationErrors: ImportError[] = [];
      jsonData.forEach((row, index) => {
        if (!row.name || !row.phone) {
          validationErrors.push({
            row: index + 2,
            error: 'Name and phone are required fields'
          });
        }
      });

      setErrors(validationErrors);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file. Please use the provided template.');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setSuccessCount(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<CustomerRow>(worksheet);

      const importErrors: ImportError[] = [];
      let successfulImports = 0;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        setProgress(((i + 1) / jsonData.length) * 100);

        try {
          if (!row.name || !row.phone) {
            throw new Error('Name and phone are required');
          }

          // Parse tags if present
          const tags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

          const { error } = await supabase
            .from('store_customers')
            .upsert({
              store_id: storeId,
              phone: row.phone,
              full_name: row.name,
              email: row.email || null,
              delivery_location: row.delivery_location || null,
              city_corporation: row.city_corporation || null,
              area: row.area || null,
              sub_area: row.sub_area || null,
              district: row.district || null,
              upazila: row.upazila || null,
              street_address: row.street_address || null,
              tags: tags.length > 0 ? tags : null,
              notes: row.notes || null,
            }, {
              onConflict: 'store_id,phone'
            });

          if (error) throw error;
          successfulImports++;
        } catch (error: any) {
          importErrors.push({
            row: i + 2,
            error: error.message
          });
        }
      }

      setSuccessCount(successfulImports);
      setErrors(importErrors);

      if (importErrors.length === 0) {
        toast.success(`Successfully imported ${successfulImports} customers`);
        onImportComplete();
        onOpenChange(false);
      } else {
        toast.warning(`Imported ${successfulImports} customers with ${importErrors.length} errors`);
      }
    } catch (error) {
      console.error('Error importing customers:', error);
      toast.error('Failed to import customers');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📤 Import Customers from CSV/XLSX</DialogTitle>
          <DialogDescription>
            Upload a file with customer information to add them in bulk
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Template File
          </Button>

          <div className="space-y-2">
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">
                  {file ? file.name : 'Click to upload CSV or XLSX file'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports .csv, .xlsx, and .xls files
                </p>
              </div>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Preview (First 5 rows)</h4>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Phone</th>
                      <th className="p-2 text-left">Location</th>
                      <th className="p-2 text-left">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.phone}</td>
                        <td className="p-2">{row.area || row.district || '-'}</td>
                        <td className="p-2">{row.tags || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Found {errors.length} error(s):</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {errors.slice(0, 5).map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.error}
                      </li>
                    ))}
                    {errors.length > 5 && (
                      <li>...and {errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing customers...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {successCount > 0 && !importing && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Successfully imported {successCount} customers
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing || errors.length > 0}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Customers
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}