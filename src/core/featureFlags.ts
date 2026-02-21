export const features = {
  desktop: {
    enabled: import.meta.env.VITE_IS_DESKTOP === 'true',
    systemTray: true,
    nativeNotifications: true,
    backgroundPresence: true,
  },
  web: {
    enabled: true,
  }
};

export const isDesktop = features.desktop.enabled;
