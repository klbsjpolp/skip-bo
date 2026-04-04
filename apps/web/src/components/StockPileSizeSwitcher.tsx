import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { DEFAULT_STOCK_SIZE, getStoredStockSize, STOCK_SIZE_OPTIONS, STOCK_STORAGE_KEY } from '@/state/initialGameState.ts';
import { useState } from 'react';

interface StockPileSizeSwitcherProps {
  onStockSizeChange?: (stockSize: number) => void;
  stockSize?: number;
}

export function StockPileSizeSwitcher({
  onStockSizeChange,
  stockSize: controlledStockSize,
}: StockPileSizeSwitcherProps) {
  const [uncontrolledStockSize, setUncontrolledStockSize] = useState<number>(() => getStoredStockSize());
  const stockSize = controlledStockSize ?? uncontrolledStockSize;

  const handleValueChange = (value: string) => {
    const nextStockSize = parseInt(value, 10);

    if (controlledStockSize === undefined) {
      setUncontrolledStockSize(nextStockSize);
    }

    onStockSizeChange?.(nextStockSize);

    try {
      if (typeof globalThis === 'object' && 'localStorage' in globalThis && globalThis.localStorage) {
        globalThis.localStorage.setItem(STOCK_STORAGE_KEY, String(nextStockSize));
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">Taille de pile</span>
      <Select value={String(stockSize)} onValueChange={handleValueChange}>
        <SelectTrigger className="w-20 shrink-0" aria-label="Taille de pile de départ">
          <SelectValue placeholder={String(DEFAULT_STOCK_SIZE)} />
        </SelectTrigger>
        <SelectContent>
          {STOCK_SIZE_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
