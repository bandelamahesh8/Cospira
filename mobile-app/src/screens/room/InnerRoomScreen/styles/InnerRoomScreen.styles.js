import { StyleSheet, Platform, Dimensions } from 'react-native';

// Design System Constants
export const COLORS = {
  // Primary Colors
  primary: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    surface: '#dbeafe',
  },
  
  // Semantic Colors
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    surface: '#dcfce7',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    surface: '#fee2e2',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    surface: '#fef3c7',
  },
  info: {
    main: '#0284c7',
    light: '#0ea5e9',
    dark: '#0369a1',
    surface: '#e0f2fe',
  },
  
  // Neutral Colors
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Background
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    dark: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Text
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
    disabled: '#cbd5e1',
  },
  
  // Borders
  border: {
    light: '#e2e8f0',
    main: '#cbd5e1',
    dark: '#94a3b8',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
};

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

// Shadow Presets
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Layout Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LAYOUT = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  headerHeight: Platform.OS === 'ios' ? 100 : 120,
  controlsHeight: 120,
  pipWidth: 120,
  pipHeight: 160,
};

// Main Styles
export const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // Header - Compact
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },

  // Live Badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.error.main,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.error.main,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.5,
  },

  // Room Code
  roomCode: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text.primary,
    letterSpacing: 1,
  },

  // User Count Pill
  userCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.xs,
  },
  userCountText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[500],
  },

  // Icon Buttons
  iconBtnSmall: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.error.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: {
    backgroundColor: COLORS.success.surface,
  },

  // Main content area - fills space between header and controls
  mainContent: {
    flex: 1,
    paddingHorizontal: 4, // ✅ Minimal padding
    paddingVertical: 4,   // ✅ Minimal padding
  },

  // Bottom controls - Absolute; bottom inset applied in component (safe area)
  bottomControlsAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
  },
  bottomControls: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  // Collapsed bar - tap to show full controls; bottom inset applied in component
  bottomControlsCollapsed: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    zIndex: 50,
  },
  bottomControlsCollapsedText: {
    color: COLORS.gray[400],
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },

  // Large Mic Button
  micBtnLarge: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
    ...{
      shadowColor: COLORS.error.main,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  micBtnActive: {
    backgroundColor: COLORS.success.main,
    shadowColor: COLORS.success.main,
  },

  // Video Grid
  videoGrid: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Participant Tile
  participantTile: {
    backgroundColor: COLORS.gray[800],
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray[700],
  },
  participantTileSingle: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  participantTilePip: {
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },

  // Participant Name Tag
  nameTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nameTagText: {
    color: COLORS.text.inverse,
    fontSize: 11,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Avatar
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  avatarInitial: {
    color: COLORS.text.inverse,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Camera Flip Button
  flipCameraBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
  },

  // Mic Indicator
  micIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: '#000',
  },
  micActive: {
    backgroundColor: COLORS.success.main,
  },
  micMuted: {
    backgroundColor: COLORS.error.main,
  },

  // Chat Overlay
  chatOverlay: {
    position: 'absolute',
    top: 100,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.xl,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  chatTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text.primary,
  },
  chatList: {
    flex: 1,
  },
  chatMsg: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    maxWidth: '80%',
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary.main,
  },
  theirMsg: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray[100],
  },
  msgText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text.primary,
  },
  myMsgText: {
    color: COLORS.text.inverse,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.xxl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  chatInput: {
    flex: 1,
    height: 40,
    color: COLORS.text.primary,
    fontSize: FONT_SIZE.md,
  },
  sendBtn: {
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.primary.main,
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text.primary,
  },

  // Grid Options (Upload Modal)
  gridOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  optionItem: {
    width: '48%',
    backgroundColor: COLORS.gray[50],
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  optionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },

  // Settings Option
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  settingsOptionText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray[700],
    marginLeft: SPACING.md,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Input Modal
  input: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  submitBtn: {
    backgroundColor: COLORS.text.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: COLORS.text.inverse,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Participants Modal
  participantsModalContent: {
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    maxHeight: '80%',
  },
  participantsList: {
    maxHeight: 400,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    backgroundColor: COLORS.gray[200],
  },
  participantInitials: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[500],
  },
  participantName: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.primary,
    fontWeight: FONT_WEIGHT.medium,
    flex: 1,
  },
  hostBadge: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: SPACING.sm,
    borderWidth: 1,
    borderColor: '#f43f5e',
  },
  hostBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: '#e11d48',
    fontWeight: FONT_WEIGHT.bold,
  },

  // BROWSER COMPONENTS
  // =========================================================================

  browserWrapper: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  // Premium Header
  browserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Navigation Controls
  browserNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },

  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },

  // URL Container
  browserUrlContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },

  browserUrl: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },

  browserCloseBtn: {
    padding: 4,
  },

  // URL Input Mode
  urlInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },

  urlSubmitButton: {
    padding: 4,
    marginRight: 4,
  },

  urlCancelButton: {
    padding: 4,
  },

  // Browser Content
  browserContent: {
    flex: 1,
    backgroundColor: '#000',
  },

  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },

  // Loading & Error States
  browserLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },

  browserLoadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#9ca3af',
    fontWeight: '500',
  },

  browserLoadingOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  browserErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },

  browserErrorText: {
    marginTop: 16,
    marginBottom: 20,
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '500',
  },

  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },

  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // ✅ ADD THIS - Missing style
  interactionHintText: {
     display: 'none',
  },

  scrollControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 8,
    zIndex: 10,
  },

  scrollButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  zoomControls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 10,
  },

  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  zoomText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },


  // Virtual Keyboard Overlay
  virtualKeyboard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100, // Ensure it's above overlay
    // React Native specific handling for pointer events usually handled by View
    // But user requested pointerEvents: 'auto' explicitly
    pointerEvents: 'auto',
  },

  keyboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  keyboardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  keyboardInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },

  keyboardInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
    paddingHorizontal: 8,
  },

  keyboardSendBtn: {
    backgroundColor: '#10b981',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  specialKeysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  specialKey: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  specialKeyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // ✅ ADD THESE TOO - Referenced in VirtualBrowser but missing
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  
  imageErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  

  // YouTube Container
  youtubeContainer: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },

  // Placeholders
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray[500],
    marginTop: SPACING.md,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Media Viewer
  mediaViewerContent: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },

  // Screen Share
  screenSharePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.dark,
    borderRadius: 30,
    overflow: 'hidden',
  },
  screenShareText: {
    fontSize: FONT_SIZE.xxl,
    color: COLORS.text.inverse,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.lg,
  },

  // Error Container
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.error.surface,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.error.main,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
    marginTop: SPACING.md,
  },

  // Network Warning Banner
  networkBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.warning.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warning.main,
    zIndex: 999,
  },
  networkBannerText: {
    color: '#b45309',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Debug Overlay Styles
  debugOverlay: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    maxHeight: 300,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugTitle: {
    color: '#0f0',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  debugText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },

  // Image Loading & Error Overlays
  // Removed: New browser styles handle this. Keeping section for potential future use or cleanup.
  
  interactionHint: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },

  interactionHintText: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '500',
  },

  navButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
  },

  keyboardSendBtnDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.5,
  },

  // Modal Grid Options
  gridOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
    marginTop: 10,
  },
  optionItem: {
    width: '48%',
    backgroundColor: '#1f2937', // Slightly lighter than background
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Audio Notice
  audioNotice: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    transform: [{ translateX: -100 }],
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 100,
  },
  audioNoticeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Projector Upload Progress
  uploadProgressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  uploadProgressBox: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: '#334155',
    ...SHADOWS.xl,
  },
  uploadProgressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 4,
  },
});

// Export individual style groups for easier imports
export const headerStyles = {
  header: styles.header,
  headerLeft: styles.headerLeft,
  headerCenter: styles.headerCenter,
  headerRight: styles.headerRight,
  liveBadge: styles.liveBadge,
  liveDot: styles.liveDot,
  liveText: styles.liveText,
  roomCode: styles.roomCode,
  userCountPill: styles.userCountPill,
  userCountText: styles.userCountText,
  iconBtnSmall: styles.iconBtnSmall,
};

export const controlStyles = {
  bottomControls: styles.bottomControls,
  controlsRow: styles.controlsRow,
  iconBtn: styles.iconBtn,
  iconBtnActive: styles.iconBtnActive,
  micBtnLarge: styles.micBtnLarge,
  micBtnActive: styles.micBtnActive,
};

export const chatStyles = {
  chatOverlay: styles.chatOverlay,
  chatHeader: styles.chatHeader,
  chatTitle: styles.chatTitle,
  chatList: styles.chatList,
  chatMsg: styles.chatMsg,
  myMsg: styles.myMsg,
  theirMsg: styles.theirMsg,
  msgText: styles.msgText,
  myMsgText: styles.myMsgText,
  chatInputContainer: styles.chatInputContainer,
  chatInput: styles.chatInput,
  sendBtn: styles.sendBtn,
};

export const modalStyles = {
  modalOverlay: styles.modalOverlay,
  modalContent: styles.modalContent,
  modalHeader: styles.modalHeader,
  modalTitle: styles.modalTitle,
  participantsModalContent: styles.participantsModalContent,
  participantsList: styles.participantsList,
  participantRow: styles.participantRow,
  participantAvatar: styles.participantAvatar,
  participantInitials: styles.participantInitials,
  participantName: styles.participantName,
  hostBadge: styles.hostBadge,
  hostBadgeText: styles.hostBadgeText,
  gridOptions: styles.gridOptions,
  optionItem: styles.optionItem,
  optionIcon: styles.optionIcon,
  optionLabel: styles.optionLabel,
};
