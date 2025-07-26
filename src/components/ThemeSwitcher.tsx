import { useTheme } from 'next-themes';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

const themes = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'metro', label: 'Metro' },
  { value: 'neon', label: 'Néon' },
  { value: 'retro', label: 'Rétro' },
];

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  return (<div className="relative">
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-24">
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
