import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { ThemeDetail } from '@skipbo/game-core';
import { themes } from '@skipbo/game-core';
import { Button } from '@/components/ui/button';
import {
  Bird,
  Blocks,
  Building2,
  Candy,
  Cog,
  Film,
  Flag,
  Moon,
  NotebookPen,
  Radio,
  Rainbow,
  Rocket,
  Shuffle,
  Spool,
  Squircle,
  Star,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { trackThemeSelection } from '@/monitoring/themeAnalytics';

// Themes name their icon as a string, so the icons have to be resolved by name.
// This map does that resolution with named imports; a `import * as Lucide` +
// `Lucide[name]` lookup reads better but pulls all ~1750 icon modules into the
// bundle, since nothing static tells the bundler which ones are reachable.
// `Record<ThemeDetail['icon'], …>` makes an unmapped icon a compile error rather
// than a blank space in the picker.
const THEME_ICONS: Record<ThemeDetail['icon'], LucideIcon> = {
  Bird,
  Blocks,
  Building2,
  Candy,
  Cog,
  Film,
  Flag,
  Moon,
  NotebookPen,
  Radio,
  Rainbow,
  Rocket,
  Spool,
  Squircle,
  Star,
  Zap,
};

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

  const getIcon = (iconName: ThemeDetail['icon']) => {
    const IconComponent = THEME_ICONS[iconName];
    return <IconComponent className="mr-2 w-4 h-4" />;
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
          {themes.map(({ value, label, icon, status }) => (
            <SelectItem key={value} value={value} data-testid={`theme-option-${value}`}>
              <div className="flex items-center">
                {getIcon(icon)}
                {label}
                {status === 'UPDATED' && (
                  <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-2xs font-bold uppercase leading-none text-secondary-foreground">
                    Amélioré
                  </span>
                )}
                {status === 'NEW' && (
                  <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-2xs font-bold uppercase leading-none text-primary-foreground">
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
        <Shuffle className="h-4 w-4" />
      </Button>
    </div>
  );
}
