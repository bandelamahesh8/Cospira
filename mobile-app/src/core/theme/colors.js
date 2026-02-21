export const colors = {
  // Light Theme (Clean Neutral)
  light: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#4B5563',
    muted: '#9CA3AF',
    border: '#E5E7EB',
  },
  
  // Dark Theme (Premium Deep Slate) - NON-NEGOTIABLE
  dark: {
    background: '#000000',
    surface: '#12151C',
    surface2: '#161A23',
    card: '#12151C',
    text: '#FFFFFF',
    textSecondary: '#A1A7B5',
    muted: '#6B7280',
    border: '#222738',
  },
  
  // Brand Identity (Premium Gradient)
  accent: ['#8B5CF6', '#3B82F6'], // Purple → Blue Gradient
  primary: '#8B5CF6',
  secondary: '#3B82F6',
  
  // Functional Colors (Restrained)
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Spacing & Layout Constants (8px Grid)
  spacing: {
    xs: 8,
    sm: 16,
    md: 24, // Card padding
    lg: 32, // Section gap
    xl: 40,
  },
  
  borderRadius: {
    sm: 10,
    md: 14, // Non-negotiable everywhere
    lg: 18,
    pill: 999,
  },
  
  // Glassmorphism (Subtle)
  glass: {
    light: 'rgba(255, 255, 255, 0.7)',
    dark: 'rgba(11, 13, 18, 0.8)',
  },

  // Legacy (Maintained for compatibility but mapped to new system)
  primaryDim: 'rgba(139, 92, 246, 0.1)',
  secondaryDim: 'rgba(59, 130, 246, 0.1)',
};
