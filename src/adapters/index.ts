import { isDesktop } from '@/core/featureFlags';
import { DesktopAdapter } from './types';
import { WebAdapter } from './web';
import { TauriDesktopAdapter } from './desktop';

let adapterInstance: DesktopAdapter | null = null;

export const getDesktopAdapter = (): DesktopAdapter => {
  if (adapterInstance) return adapterInstance;

  if (isDesktop) {
    adapterInstance = new TauriDesktopAdapter();
  } else {
    adapterInstance = new WebAdapter();
  }

  return adapterInstance;
};
