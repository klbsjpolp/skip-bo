import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { ThemeDetail } from '@/types';
import { themes } from '@/types';
import { Button } from '@/components/ui/button';
import * as Lucide from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { trackThemeSelection } from '@/monitoring/themeAnalytics';

/** Picks a theme other than `current`, or `null` when none is available. */
function pickRandomTheme(current: ThemeDetail['value']): ThemeDetail['value'] | null {
  const available = themes.map(({ value }) => value).filter((value) => value !== current);
  if (available.length === 0) {
    return null;
  }
  return available[Math.floor(Math.random() * available.length)];
}

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const activeTheme: ThemeDetail = themes.find(({ value }) => value === theme) ?? themes[0];

  const getIcon = (iconName: string) => {
    const IconComponent = Lucide[iconName as keyof typeof Lucide] as unknown as ComponentType<SVGProps<SVGSVGElement>>;
    return IconComponent ? <IconComponent className="mr-2 w-4 h-4" /> : null;
  };

  const setRandomTheme = () => {
    const randomTheme = pickRandomTheme(activeTheme.value);
    if (!randomTheme) {
      return;
    }
    trackThemeSelection({ theme: randomTheme, previousTheme: activeTheme.value, source: 'random' });
    setTheme(randomTheme);
  };

  return (
    <div className="relative flex items-center gap-0.5" data-testid="theme-switcher">
      <Select
        value={activeTheme.value}
        onValueChange={(value) => {
          trackThemeSelection({
            theme: value as ThemeDetail['value'],
            previousTheme: activeTheme.value,
            source: 'manual',
          });
          setTheme(value);
        }}
      >
        <SelectTrigger className="w-36" data-testid="theme-switcher-trigger" aria-label="Thème">
          <div className="flex items-center">
            {getIcon(activeTheme.icon)}
            {activeTheme.label}
          </div>
        </SelectTrigger>
        <SelectContent data-testid="theme-switcher-content" className="popper">
          {themes.map(({ value, label, icon }) => (
            <SelectItem key={value} value={value} data-testid={`theme-option-${value}`}>
              <div className="flex items-center">
                {getIcon(icon)}
                {label}
                {value === 'theme-cinema' && (
                  <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-primary-foreground">
                    Nouveau
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        onClick={setRandomTheme}
        aria-label="Thème aléatoire"
        title="Thème aléatoire"
        data-testid="theme-randomizer-button"
      >
        <Lucide.Shuffle className="h-4 w-4" />
      </Button>
    </div>
  );
}
