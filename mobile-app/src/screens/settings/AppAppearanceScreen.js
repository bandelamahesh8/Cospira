import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PressableScale from '../../components/animations/PressableScale';
import FadeView from '../../components/animations/FadeView';
import { useTheme } from '../../hooks/useTheme';

const AppAppearanceScreen = ({ navigation }) => {
  const { themeMode, setThemeMode, isDark, colors } = useTheme();

  const themeOptions = [
    {
      id: 'light',
      title: 'Light Mode',
      description: 'Bright and clean interface',
      icon: 'sunny',
      iconColor: '#f59e0b',
      gradient: ['#fef3c7', '#fde68a'],
    },
    {
      id: 'dark',
      title: 'Dark Mode',
      description: 'Easy on the eyes',
      icon: 'moon',
      iconColor: '#8b5cf6',
      gradient: ['#1e1b4b', '#312e81'],
    },
    {
      id: 'system',
      title: 'System Default',
      description: 'Matches device settings',
      icon: 'phone-portrait',
      iconColor: '#3b82f6',
      gradient: ['#dbeafe', '#bfdbfe'],
    },
  ];

  const handleThemeSelect = async (mode) => {
    await setThemeMode(mode);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>App Appearance</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <FadeView delay={0}>
          <View style={styles.descriptionContainer}>
            <Ionicons name="color-palette" size={32} color={colors.primary} />
            <Text style={[styles.descriptionTitle, { color: colors.text }]}>
              Choose Your Theme
            </Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              Customize how Cospira looks on your device. Changes apply instantly.
            </Text>
          </View>
        </FadeView>

        {/* Theme Options */}
        <View style={styles.optionsContainer}>
          {themeOptions.map((option, index) => {
            const isSelected = themeMode === option.id;
            
            return (
              <FadeView key={option.id} delay={100 + index * 100}>
                <PressableScale
                  style={[
                    styles.themeCard,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                    isSelected && styles.themeCardSelected,
                  ]}
                  onPress={() => handleThemeSelect(option.id)}
                  scaleTo={0.97}
                >
                  {/* Icon Container */}
                  <View style={[styles.iconContainer, { backgroundColor: `${option.iconColor}20` }]}>
                    <Ionicons name={option.icon} size={32} color={option.iconColor} />
                  </View>

                  {/* Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.themeTitle, { color: colors.text }]}>
                        {option.title}
                      </Text>
                      {isSelected && (
                        <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <View style={[styles.selectionGlow, { backgroundColor: colors.primary }]} />
                  )}
                </PressableScale>
              </FadeView>
            );
          })}
        </View>

        {/* Info Card */}
        <FadeView delay={400}>
          <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              System Default automatically switches between light and dark based on your device settings.
            </Text>
          </View>
        </FadeView>

        <FadeView delay={500}>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </FadeView>

        <View style={styles.footerPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
  },
  descriptionContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  descriptionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  descriptionText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  themeCardSelected: {
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  themeTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  themeDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  footerPadding: {
    height: 40,
  },
});

export default AppAppearanceScreen;
