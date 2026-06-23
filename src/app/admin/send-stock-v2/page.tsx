'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { HierarchicalProductSelector, type SelectedItem } from '@/components/stock/HierarchicalProductSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Location {
  id: string;
  name: string;
  type: string;
}

export default function SendStockV2Page() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [referenceInvoice, setReferenceInvoice] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [note, setNote] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await fetch('/api/locations');
      if (!res.ok) throw new Error('Failed to fetch locations');
      return res.json();
    },
  });

  // Validate stock mutation
  const validateMutation = useMutation({
    mutationFn: async (items: SelectedItem[]) => {
      const res = await fetch('/api/products/bulk-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: fromLocationId,
          items: items.map((item) => ({
            productColorId: item.productColorId,
            quantity: item.quantity,
          })),
        }),
      });
      if (!res.ok) throw new Error('Validation failed');
      return res.json();
    },
  });

  // Create transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/stock-send-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create transfer');
      }
      return res.json();
    },
    onSuccess: () => {
      // Reset form
      setFromLocationId('');
      setToLocationId('');
      setReferenceInvoice('');
      setInvoiceDate('');
      setNote('');
      setSelectedItems([]);
      setValidationErrors([]);
      queryClient.invalidateQueries({ queryKey: ['stock-sends'] });
    },
  });

  const handleValidateAndSubmit = async () => {
    setValidationErrors([]);

    // Client-side validation
    const errors: string[] = [];
    if (!fromLocationId) errors.push('From location is required');
    if (!toLocationId) errors.push('To location is required');
    if (fromLocationId === toLocationId) errors.push('From and To locations must be different');
    if (selectedItems.length === 0) errors.push('At least one item is required');
    if (selectedItems.some((item) => item.quantity <= 0)) {
      errors.push('All items must have quantity > 0');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Validate stock availability
    const validationResult = await validateMutation.mutateAsync(selectedItems);

    if (!validationResult.allValid) {
      const invalidItems = validationResult.validations
        .filter((v: any) => !v.isValid)
        .map((v: any) => v.message);
      setValidationErrors(invalidItems);
      return;
    }

    // Create transfer
    const payload = {
      fromLocationId,
      toLocationId,
      referenceInvoice,
      invoiceDate: invoiceDate || null,
      note,
      items: selectedItems.map((item) => ({
        productColorId: item.productColorId,
        quantityDispatched: item.quantity,
      })),
    };

    await createTransferMutation.mutateAsync(payload);
  };

  const isFormValid =
    fromLocationId &&
    toLocationId &&
    fromLocationId !== toLocationId &&
    selectedItems.length > 0 &&
    selectedItems.every((item) => item.quantity > 0);

  const warehouseLocations = locations.filter((loc) => loc.type === 'WAREHOUSE');
  const shopLocations = locations.filter((loc) => loc.type === 'SHOP');

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Send Stock (Hierarchical)</h1>
        <p className="text-gray-600 mt-2">
          Send stock from one location to another with real-time stock validation
        </p>
      </div>

      {createTransferMutation.isSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Stock transfer created successfully!
          </AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromLocation">From Location *</Label>
              <Select value={fromLocationId} onValueChange={setFromLocationId}>
                <SelectTrigger id="fromLocation">
                  <SelectValue placeholder="Select source location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" disabled>
                    Select source location
                  </SelectItem>
                  {warehouseLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toLocation">To Location *</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger id="toLocation">
                  <SelectValue placeholder="Select destination location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" disabled>
                    Select destination location
                  </SelectItem>
                  {[...warehouseLocations, ...shopLocations].map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceInvoice">Reference Invoice</Label>
              <Input
                id="referenceInvoice"
                value={referenceInvoice}
                onChange={(e) => setReferenceInvoice(e.target.value)}
                placeholder="Optional invoice reference"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes about this transfer"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Products</CardTitle>
        </CardHeader>
        <CardContent>
          {!fromLocationId ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a "From Location" first to see available stock
              </AlertDescription>
            </Alert>
          ) : (
            <HierarchicalProductSelector
              locationId={fromLocationId}
              onSelectionChange={setSelectedItems}
              initialItems={selectedItems}
              disabled={createTransferMutation.isPending || validateMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setFromLocationId('');
            setToLocationId('');
            setReferenceInvoice('');
            setInvoiceDate('');
            setNote('');
            setSelectedItems([]);
            setValidationErrors([]);
          }}
        >
          Clear Form
        </Button>
        <Button
          onClick={handleValidateAndSubmit}
          disabled={
            !isFormValid ||
            createTransferMutation.isPending ||
            validateMutation.isPending
          }
        >
          {createTransferMutation.isPending || validateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {validateMutation.isPending ? 'Validating...' : 'Creating...'}
            </>
          ) : (
            'Create Transfer'
          )}
        </Button>
      </div>
    </div>
  );
}
