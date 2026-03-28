import { useTheme } from 'next-themes';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {themes} from "@/types";
import * as Lucide from 'lucide-react';
import type {ComponentType, SVGProps} from "react";

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  const getIcon = (iconName: string) => {
    const IconComponent = Lucide[iconName as keyof typeof Lucide] as unknown as ComponentType<SVGProps<SVGSVGElement>>;
    return IconComponent ? <IconComponent className="w-4 h-4 mr-2" /> : null;
  };

  return (<div className="relative" data-testid="theme-switcher">
    <Select value={theme} onValueChange={setTheme}>
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
  </div>
  );
}
