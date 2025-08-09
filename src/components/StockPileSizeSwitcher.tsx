import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel} from "@/components/ui/select.tsx";
import {DEFAULT_STOCK_SIZE, getStoredStockSize, STOCK_STORAGE_KEY} from "@/state/initialGameState.ts";
import {useEffect, useState} from "react";

const options = Array.from({ length: 10 }, (_, i) => (i + 1) * 5); // 5..50

export function StockPileSizeSwitcher() {
  const [stockSize, setStockSize] = useState<number>(DEFAULT_STOCK_SIZE);

  useEffect(() => {
    setStockSize(getStoredStockSize());
  }, []);

  const handleValueChange = (value: string) => {
    const stockSize = parseInt(value, 10);
    setStockSize(stockSize);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STOCK_STORAGE_KEY, String(stockSize));
      }
    } catch { /* ignore */ }
  };

  return <SelectGroup className="flex items-baseline gap-2">
    <SelectLabel>Pile: </SelectLabel>
    <Select
      value={String(stockSize)}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-15">
        <SelectValue placeholder={DEFAULT_STOCK_SIZE} />
      </SelectTrigger>
      <SelectContent>
        {options.map((n) => (
          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </SelectGroup>
}