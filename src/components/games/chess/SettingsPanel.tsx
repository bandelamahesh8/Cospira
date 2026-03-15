/**
 * Settings Panel Component
 * Allows users to toggle chess game features
 */

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { loadSettings, SETTINGS_STORAGE_KEY, FeatureToggles } from './SettingsUtils';

interface SettingsPanelProps {
  onSettingsChange?: (settings: FeatureToggles) => void;
}

export const SettingsPanel = ({ onSettingsChange }: SettingsPanelProps) => {
  const [settings, setSettings] = useState<FeatureToggles>(() => loadSettings());

  const updateSetting = (key: keyof FeatureToggles, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      onSettingsChange?.(newSettings);
    } catch (error) {
      console.warn('[Settings] Failed to save settings:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10 space-y-3'
    >
      <h3 className='text-sm font-bold text-white flex items-center gap-2'>
        <Settings className='w-4 h-4 text-slate-400' />
        Settings
      </h3>

      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-slate-300'>Sound Effects</p>
            <p className='text-xs text-slate-500'>Move and capture sounds</p>
          </div>
          <Switch
            checked={settings.sounds}
            onCheckedChange={(checked) => updateSetting('sounds', checked)}
          />
        </div>

        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-slate-300'>Blunder Warnings</p>
            <p className='text-xs text-slate-500'>Alert before losing material</p>
          </div>
          <Switch
            checked={settings.blunderWarnings}
            onCheckedChange={(checked) => updateSetting('blunderWarnings', checked)}
          />
        </div>

        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-slate-300'>Focus Mode</p>
            <p className='text-xs text-slate-500'>Hide UI when time is low</p>
          </div>
          <Switch
            checked={settings.focusMode}
            onCheckedChange={(checked) => updateSetting('focusMode', checked)}
          />
        </div>

        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm text-slate-300'>Anti-Rage Cooldown</p>
            <p className='text-xs text-slate-500'>Delay after losses</p>
          </div>
          <Switch
            checked={settings.antiRage}
            onCheckedChange={(checked) => updateSetting('antiRage', checked)}
          />
        </div>
      </div>
    </motion.div>
  );
};
