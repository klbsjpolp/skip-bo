import { useTheme } from 'next-themes';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {themes} from "@/types";
import { Sun, Flower2, Rainbow, Moon, Building2, Zap, Radio, Droplet, Squircle } from 'lucide-react';

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  const getIcon = (iconName: string) => {
    const icons = { Sun, Flower2, Rainbow, Moon, Building2, Zap, Radio, Droplet, Squircle };
    const IconComponent = icons[iconName as keyof typeof icons];
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
