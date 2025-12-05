import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Download, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

interface CSVProduct {
  name: string;
  description?: string;
  price: string;
  product_type?: 'digital' | 'physical' | 'both';
  stock_quantity?: string;
  category?: string;
  is_active?: string;
}

interface ParsedProduct extends CSVProduct {
  status: 'pending' | 'success' | 'error';
  error?: string;
  rowNumber: number;
}

interface BulkProductImportProps {
  storeId: string;
  categories: { id: string; name: string }[];
  onImportComplete: () => void;
}

export function BulkProductImport({ storeId, categories, onImportComplete }: BulkProductImportProps) {
  const [open, setOpen] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const downloadTemplate = () => {
    const template = `name,description,price,product_type,stock_quantity,category,is_active
"Sample Product 1","A great product",29.99,physical,100,Electronics,true
"Sample Product 2","Another product",49.99,digital,0,Software,true
"Sample Product 3","Third product",19.99,both,50,Books,false`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validateProduct = (product: CSVProduct, rowNumber: number): ParsedProduct => {
    const errors: string[] = [];

    // Validate required fields
    if (!product.name?.trim()) {
      errors.push('Name is required');
    }

    if (!product.price || isNaN(parseFloat(product.price)) || parseFloat(product.price) < 0) {
      errors.push('Valid price is required');
    }

    // Validate product type
    const validTypes = ['digital', 'physical', 'both'];
    if (product.product_type && !validTypes.includes(product.product_type)) {
      errors.push(`Product type must be one of: ${validTypes.join(', ')}`);
    }

    // Validate stock quantity
    if (product.stock_quantity && (isNaN(parseInt(product.stock_quantity)) || parseInt(product.stock_quantity) < 0)) {
      errors.push('Stock quantity must be a positive number');
    }

    // Validate category
    if (product.category && !categories.find(c => c.name.toLowerCase() === product.category?.toLowerCase())) {
      errors.push(`Category "${product.category}" not found`);
    }

    // Validate is_active
    if (product.is_active && !['true', 'false', '1', '0', 'yes', 'no'].includes(product.is_active.toLowerCase())) {
      errors.push('is_active must be true/false, yes/no, or 1/0');
    }

    return {
      ...product,
      status: errors.length > 0 ? 'error' : 'pending',
      error: errors.join(', '),
      rowNumber,
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    Papa.parse<CSVProduct>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }

        const validated = results.data.map((product, index) =>
          validateProduct(product, index + 2) // +2 because of header row and 0-indexing
        );

        setParsedProducts(validated);
        
        const errorCount = validated.filter(p => p.status === 'error').length;
        if (errorCount > 0) {
          toast.warning(`Found ${errorCount} product(s) with errors. Please review before importing.`);
        } else {
          toast.success(`Successfully parsed ${validated.length} products`);
        }
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });

    // Reset the input
    e.target.value = '';
  };

  const handleImport = async () => {
    const validProducts = parsedProducts.filter(p => p.status === 'pending');
    if (validProducts.length === 0) {
      toast.error('No valid products to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validProducts.length; i++) {
      const product = validProducts[i];
      
      try {
        // Find category ID if category name is provided
        let categoryId: string | null = null;
        if (product.category) {
          const category = categories.find(
            c => c.name.toLowerCase() === product.category?.toLowerCase()
          );
          categoryId = category?.id || null;
        }

        // Parse is_active
        const isActive = product.is_active
          ? ['true', '1', 'yes'].includes(product.is_active.toLowerCase())
          : true;

        // Insert product
        const { error } = await supabase.from('products').insert({
          store_id: storeId,
          name: product.name.trim(),
          description: product.description?.trim() || null,
          price: parseFloat(product.price),
          product_type: (product.product_type || 'physical') as 'digital' | 'physical' | 'both',
          stock_quantity: product.stock_quantity ? parseInt(product.stock_quantity) : 0,
          category_id: categoryId,
          is_active: isActive,
        });

        if (error) throw error;

        // Update status
        setParsedProducts(prev =>
          prev.map(p =>
            p.rowNumber === product.rowNumber
              ? { ...p, status: 'success' as const }
              : p
          )
        );
        successCount++;
      } catch (error: any) {
        // Update status with error
        setParsedProducts(prev =>
          prev.map(p =>
            p.rowNumber === product.rowNumber
              ? { ...p, status: 'error' as const, error: error.message }
              : p
          )
        );
        errorCount++;
      }

      setImportProgress(((i + 1) / validProducts.length) * 100);
    }

    setImporting(false);
    
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} product(s)`);
      onImportComplete();
    }
    
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} product(s)`);
    }
  };

  const handleReset = () => {
    setParsedProducts([]);
    setImportProgress(0);
  };

  const handleClose = () => {
    setOpen(false);
    handleReset();
  };

  const stats = {
    total: parsedProducts.length,
    valid: parsedProducts.filter(p => p.status === 'pending').length,
    errors: parsedProducts.filter(p => p.status === 'error').length,
    success: parsedProducts.filter(p => p.status === 'success').length,
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Upload className="h-4 w-4 mr-1" />
        Bulk Import
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Product Import</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload a CSV file with your products. Download the template below to see the required format.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="csv-upload">Upload CSV File</Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="cursor-pointer"
                />
              </div>
              <Button variant="outline" onClick={downloadTemplate} type="button">
                <Download className="h-4 w-4 mr-1" />
                Download Template
              </Button>
            </div>

            {parsedProducts.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.valid}</div>
                    <div className="text-sm text-muted-foreground">Valid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                    <div className="text-sm text-muted-foreground">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {importing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Importing products...</span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} />
                  </div>
                )}

                <div className="border rounded-lg max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Row</TableHead>
                        <TableHead className="w-[60px]">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedProducts.map((product) => (
                        <TableRow key={product.rowNumber}>
                          <TableCell className="font-mono text-xs">{product.rowNumber}</TableCell>
                          <TableCell>
                            {product.status === 'pending' && (
                              <Badge variant="secondary">
                                <AlertCircle className="h-3 w-3" />
                              </Badge>
                            )}
                            {product.status === 'success' && (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3" />
                              </Badge>
                            )}
                            {product.status === 'error' && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3" />
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>${parseFloat(product.price || '0').toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.product_type || 'physical'}</Badge>
                          </TableCell>
                          <TableCell>{product.stock_quantity || 0}</TableCell>
                          <TableCell>{product.category || '-'}</TableCell>
                          <TableCell className="text-sm text-destructive">
                            {product.error || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            {parsedProducts.length > 0 && !importing && (
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} disabled={importing}>
              Cancel
            </Button>
            {stats.valid > 0 && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {stats.valid} Product{stats.valid !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
