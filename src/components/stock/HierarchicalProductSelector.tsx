'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';

export interface SelectedItem {
  productColorId: string;
  sku: string;
  display: string;
  quantity: number;
  available: number;
  unit: string;
  alternateUnit?: string | null;
  conversionFactor?: number | null;
  costPrice?: number | null;
  category: string;
  product: string;
  variant: string;
  color: string;
  colorHex?: string | null;
  colorName?: string | null;
}

interface SearchResult {
  id: string;
  sku: string;
  category: string;
  product: string;
  variant: string;
  design?: string | null;
  color: string;
  colorName?: string | null;
  colorHex?: string | null;
  available: number;
  unit: string;
  alternateUnit?: string | null;
  conversionFactor?: number | null;
  costPrice?: number | null;
  display: string;
  groupKey: string;
}

interface GroupedResult {
  category: string;
  product: string;
  variant: string;
  design?: string | null;
  colors: SearchResult[];
}

interface HierarchicalProductSelectorProps {
  locationId: string;
  onSelectionChange: (items: SelectedItem[]) => void;
  selectedItems?: SelectedItem[];
  disabled?: boolean;
}

export function HierarchicalProductSelector({
  locationId,
  onSelectionChange,
  selectedItems: externalSelectedItems = [],
  disabled = false,
}: HierarchicalProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(externalSelectedItems);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Sync external selectedItems and notify parent on changes
  useEffect(() => {
    onSelectionChange(selectedItems);
  }, [selectedItems, onSelectionChange]);

  // Search products
  const { data: searchData, isLoading } = useQuery({
    queryKey: ['product-search', debouncedSearch, locationId],
    queryFn: async () => {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(debouncedSearch)}&locationId=${locationId}`
      );
      if (!res.ok) throw new Error('Failed to search');
      return res.json() as Promise<{ results: SearchResult[]; grouped: GroupedResult[] }>;
    },
    enabled: debouncedSearch.length >= 2 && !!locationId,
  });

  // Group results by product+variant
  const groupedResults = useMemo(() => {
    return searchData?.grouped || [];
  }, [searchData]);

  const handleAddColor = (color: SearchResult) => {
    // Check if already added
    if (selectedItems.some((item) => item.productColorId === color.id)) {
      return;
    }

    const newItem: SelectedItem = {
      productColorId: color.id,
      sku: color.sku,
      display: color.display,
      quantity: 0,
      available: color.available,
      unit: color.unit,
      alternateUnit: color.alternateUnit,
      conversionFactor: color.conversionFactor,
      costPrice: color.costPrice,
      category: color.category,
      product: color.product,
      variant: color.variant,
      color: color.color,
      colorHex: color.colorHex,
      colorName: color.colorName,
    };

    setSelectedItems((prev) => [...prev, newItem]);
  };

  const handleQuantityChange = (productColorId: string, quantity: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.productColorId === productColorId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemove = (productColorId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.productColorId !== productColorId));
  };

  const handleClearAll = () => {
    setSelectedItems([]);
    setSearchQuery('');
  };

  // Notify parent of changes
  useEffect(() => {
    onSelectionChange(selectedItems);
  }, [selectedItems, onSelectionChange]);

  // Calculate alternate quantity
  const calculateAlternateQty = (item: SelectedItem) => {
    if (!item.alternateUnit || !item.conversionFactor || item.quantity === 0) {
      return null;
    }
    return (item.quantity / item.conversionFactor).toFixed(2);
  };

  // Get stock availability status
  const getStockStatus = (available: number) => {
    if (available > 100) return { variant: 'default' as const, label: 'In Stock' };
    if (available > 10) return { variant: 'secondary' as const, label: 'Low Stock' };
    if (available > 0) return { variant: 'destructive' as const, label: 'Very Low' };
    return { variant: 'destructive' as const, label: 'Out of Stock' };
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by category, product, shade, or color..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Search Instructions */}
      {!debouncedSearch && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Start typing to search products (minimum 2 characters). You can search by category,
            product name, shade code, or color.
          </AlertDescription>
        </Alert>
      )}

      {/* Grouped Results */}
      {debouncedSearch.length >= 2 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : groupedResults.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No products found matching "{debouncedSearch}"
              </AlertDescription>
            </Alert>
          ) : (
            groupedResults.map((group) => (
              <Card key={`${group.product}-${group.variant}`}>
                <CardHeader className="pb-2">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {group.category}
                    </div>
                    <CardTitle className="text-sm font-bold">
                      {group.product}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Shade/Item Code: {group.variant}
                      </Badge>
                      {group.design && (
                        <span className="text-xs text-gray-600">{group.design}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Colors:</div>
                    {group.colors.map((color) => {
                      const isSelected = selectedItems.some(
                        (i) => i.productColorId === color.id
                      );
                      const stockStatus = getStockStatus(color.available);

                      return (
                        <div
                          key={color.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            {color.colorHex && (
                              <div
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: color.colorHex }}
                                title={color.colorName || color.color}
                              />
                            )}
                            <div>
                              <div className="font-medium text-sm">{color.color}</div>
                              {color.colorName && (
                                <div className="text-xs text-gray-500">{color.colorName}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <Badge variant={stockStatus.variant}>
                                {color.available} {color.unit}
                              </Badge>
                            </div>

                            {isSelected ? (
                              <Badge variant="secondary">Added ✓</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddColor(color)}
                                disabled={disabled || color.available === 0}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Selected Items ({selectedItems.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={disabled}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedItems.map((item) => {
              const alternateQty = calculateAlternateQty(item);
              const isValid = item.quantity > 0 && item.quantity <= item.available;
              const hasQuantity = item.quantity > 0;

              return (
                <div
                  key={item.productColorId}
                  className="flex items-start gap-3 p-3 border rounded"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-2">{item.display}</div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max={item.available}
                        step="0.01"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          handleQuantityChange(
                            item.productColorId,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-32"
                        placeholder="Quantity"
                        disabled={disabled}
                      />
                      <span className="text-sm text-gray-600">{item.unit}</span>

                      {alternateQty && (
                        <span className="text-xs text-gray-500">
                          ≈ {alternateQty} {item.alternateUnit}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-xs">
                      {isValid ? (
                        <span className="text-green-600">
                          ✓ Available ({item.available} {item.unit})
                        </span>
                      ) : !hasQuantity ? (
                        <span className="text-gray-500">Enter quantity</span>
                      ) : (
                        <span className="text-red-600">
                          ⚠ Exceeds available stock ({item.available} {item.unit})
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemove(item.productColorId)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
