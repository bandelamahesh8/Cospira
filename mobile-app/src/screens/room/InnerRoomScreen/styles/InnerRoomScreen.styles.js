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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    ...SHADOWS.sm,
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
  liveBadgeWrapper: {
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.full,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error.main,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.error.main,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  signalIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  // Room Code
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.lg,
  },
  roomCodePrefix: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.gray[400],
    marginRight: 6,
  },
  roomCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: 1.5,
  },

  // Header Right Actions
  headerActionPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  participantPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  headerActionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
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

  mainContent: {
    flex: 1,
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },

  // Bottom controls - Floating Premium Panel
  bottomControlsAbsolute: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 100,
  },
  floatingControlsContainer: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 40,
    borderWidth: 1,
    ...SHADOWS.xl,
  },
  bottomControlsCollapsed: {
    position: 'absolute',
    left: '25%',
    right: '25%',
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 24,
    zIndex: 100,
    borderWidth: 1,
    ...SHADOWS.lg,
  },
  bottomControlsCollapsedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  glassBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  micBtnPremium: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  micBtnPremiumActive: {
    backgroundColor: COLORS.primary.main,
    shadowColor: COLORS.primary.main,
    shadowOpacity: 0.5,
    shadowRadius: 15,
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
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.2,
    margin: 4, // Further reduced margin
    ...SHADOWS.md,
  },
  participantTileSingle: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle backdrop even when single
    borderWidth: 1.2,
    margin: 0, // No margin for single tile to fill container
  },
  participantTilePip: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },

  // Tile Placeholder (Loading/Paused)
  tilePlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileAvatarImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  placeholderOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  connectingText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // Avatar Container (Video Off)
  avatarContainerLarge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  avatarHalo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  premiumAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  premiumNameText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  videoOffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  videoOffText: {
    color: COLORS.error.main,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Premium Name Tag
  premiumNameTag: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'flex-start',
  },
  nameTagBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 2,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  premiumNameTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Flip Camera Premium
  flipCameraBtnPremium: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Mic Indicator - Base style
  micIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  micIndicatorAbsolute: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  micActive: {
    backgroundColor: COLORS.success.main,
  },
  micMuted: {
    backgroundColor: COLORS.error.main,
  },

  // Chat Overlay
  chatOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    zIndex: 1000,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  chatTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  chatSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatList: {
    flex: 1,
  },
  emptyChatState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyChatSubText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    opacity: 0.7,
  },
  chatMsgContainer: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  myMsgContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirMsgContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 14, // align with bubble bottom
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  senderName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 4,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatMsg: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    ...SHADOWS.sm,
  },
  myMsg: {
    borderBottomRightRadius: 2,
    marginLeft: 40,
  },
  theirMsg: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 40,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  myMsgText: {
    color: '#fff',
    fontWeight: '600',
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    marginHorizontal: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  attachmentBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chatInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  chatInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontWeight: '500',
  },
  emojiBtn: {
    padding: 4,
  },
  sendBtn: {
    marginLeft: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  
  // Inline Chat Attachment Menu
  chatAttachPopup: {
    position: 'absolute',    
    bottom: Platform.OS === 'ios' ? 100 : 75,
    left: 16,
    width: 200,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
    ...SHADOWS.xl,
    elevation: 10,
    zIndex: 1000,
  },
  chatAttachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  chatAttachIconContainer: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'flex-start',
      marginRight: 8,
  },
  chatAttachOptionText: {
    fontSize: 16,
    fontWeight: '400',
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

  // List Options (Compact Chat Upload Modal)
  listOptions: {
    flexDirection: 'column',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  listLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text.primary,
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
  liveBadgeWrapper: styles.liveBadgeWrapper,
  liveBadge: styles.liveBadge,
  liveDot: styles.liveDot,
  liveText: styles.liveText,
  signalIndicator: styles.signalIndicator,
  roomCodeContainer: styles.roomCodeContainer,
  roomCodePrefix: styles.roomCodePrefix,
  roomCodeText: styles.roomCodeText,
  headerActionPill: styles.headerActionPill,
  participantPillInner: styles.participantPillInner,
  headerPillText: styles.headerPillText,
  headerActionCircle: styles.headerActionCircle,
};

export const controlStyles = {
  bottomControlsAbsolute: styles.bottomControlsAbsolute,
  floatingControlsContainer: styles.floatingControlsContainer,
  bottomControlsCollapsed: styles.bottomControlsCollapsed,
  bottomControlsCollapsedText: styles.bottomControlsCollapsedText,
  controlsRow: styles.controlsRow,
  glassBtn: styles.glassBtn,
  glassBtnActive: styles.glassBtnActive,
  micBtnPremium: styles.micBtnPremium,
  micBtnPremiumActive: styles.micBtnPremiumActive,
};

export const chatStyles = {
  chatOverlay: styles.chatOverlay,
  chatHeader: styles.chatHeader,
  chatTitle: styles.chatTitle,
  chatSubTitle: styles.chatSubTitle,
  closeBtnCircle: styles.closeBtnCircle,
  chatList: styles.chatList,
  emptyChatState: styles.emptyChatState,
  emptyIconContainer: styles.emptyIconContainer,
  emptyChatText: styles.emptyChatText,
  emptyChatSubText: styles.emptyChatSubText,
  chatMsgContainer: styles.chatMsgContainer,
  myMsgContainer: styles.myMsgContainer,
  theirMsgContainer: styles.theirMsgContainer,
  msgAvatar: styles.msgAvatar,
  avatarText: styles.avatarText,
  senderName: styles.senderName,
  chatMsg: styles.chatMsg,
  myMsg: styles.myMsg,
  theirMsg: styles.theirMsg,
  msgText: styles.msgText,
  myMsgText: styles.myMsgText,
  msgTime: styles.msgTime,
  chatInputContainer: styles.chatInputContainer,
  attachmentBtn: styles.attachmentBtn,
  chatInputWrapper: styles.chatInputWrapper,
  chatInput: styles.chatInput,
  emojiBtn: styles.emojiBtn,
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
