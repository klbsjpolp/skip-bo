import { useTheme } from 'next-themes';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {themes} from "@/types";

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  return (<div className="relative">
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Thème" />
      </SelectTrigger>
      <SelectContent>
        {themes.map(({ value, label }) => (
          <SelectItem key={value} value={value} onClick={() => setTheme(value)}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  );
}
