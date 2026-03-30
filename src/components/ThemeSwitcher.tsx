import { useTheme } from 'next-themes';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {themes, type Theme} from "@/types";
import { Button } from '@/components/ui/button';
import * as Lucide from 'lucide-react';
import type {ComponentType, SVGProps} from "react";

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const activeTheme: Theme = themes.some(({ value }) => value === theme)
    ? theme as Theme
    : 'theme-light';

  const getIcon = (iconName: string) => {
    const IconComponent = Lucide[iconName as keyof typeof Lucide] as unknown as ComponentType<SVGProps<SVGSVGElement>>;
    return IconComponent ? <IconComponent className="w-4 h-4 mr-2" /> : null;
  };

  const setRandomTheme = () => {
    const availableThemes = themes
      .map(({ value }) => value)
      .filter((value) => value !== activeTheme);

    if (availableThemes.length === 0) {
      return;
    }

    const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    setTheme(randomTheme);
  };

  return (
    <div className="relative flex items-center gap-2" data-testid="theme-switcher">
      <Select value={activeTheme} onValueChange={setTheme}>
        <SelectTrigger className="w-32" data-testid="theme-switcher-trigger" aria-label="Thème">
          <SelectValue placeholder="Thème" />
        </SelectTrigger>
        <SelectContent data-testid="theme-switcher-content">
          {themes.map(({ value, label, icon }) => (
            <SelectItem key={value} value={value} data-testid={`theme-option-${value}`}>
              <div className="flex items-center">
                {getIcon(icon)}
                {label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
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
