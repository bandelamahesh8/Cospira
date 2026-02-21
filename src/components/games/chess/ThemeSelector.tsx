/**
 * Theme Selector Component
 * Allows users to choose and preview board themes
 */

import { BOARD_THEMES, ThemeName } from '@/lib/chess/themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeSelectorProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export const ThemeSelector = ({ currentTheme, onThemeChange }: ThemeSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(BOARD_THEMES).map(([key, theme]) => (
        <Button
          key={key}
          size="sm"
          variant={currentTheme === key ? 'default' : 'outline'}
          onClick={() => onThemeChange(key as ThemeName)}
          className={cn(
            "gap-2",
            currentTheme === key 
              ? "bg-blue-600 hover:bg-blue-700" 
              : "bg-slate-800 border-slate-700 hover:bg-slate-700"
          )}
        >
          <div className="flex gap-1">
            <div 
              className="w-4 h-4 rounded border border-white/20" 
              style={{ backgroundColor: theme.lightSquare }}
            />
            <div 
              className="w-4 h-4 rounded border border-white/20" 
              style={{ backgroundColor: theme.darkSquare }}
            />
          </div>
          <span className="text-xs font-bold">{theme.name}</span>
        </Button>
      ))}
    </div>
  );
};
