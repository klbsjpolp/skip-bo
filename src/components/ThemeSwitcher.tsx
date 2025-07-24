import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const themes = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'metro', label: 'Metro' },
  { value: 'neon', label: 'Néon' },
  { value: 'retro', label: 'Rétro' },
];

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  return (
    <div className="flex justify-center gap-4 mb-6 text-foreground">
      {themes.map(({ value, label }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "outline"}
          size="sm"
          onClick={() => setTheme(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
