import { useTheme } from 'next-themes';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {themes} from "@/types";
import * as Lucide from 'lucide-react';
import {ComponentType, SVGProps} from "react";

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  const getIcon = (iconName: string) => {
    const IconComponent = Lucide[iconName as keyof typeof Lucide] as unknown as ComponentType<SVGProps<SVGSVGElement>>;
    return IconComponent ? <IconComponent className="w-4 h-4 mr-2" /> : null;
  };

  return (<div className="relative">
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Thème" />
      </SelectTrigger>
      <SelectContent>
        {themes.map(({ value, label, icon }) => (
          <SelectItem key={value} value={value}>
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
