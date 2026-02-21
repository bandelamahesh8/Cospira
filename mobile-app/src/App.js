import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, Animated, View } from 'react-native';
import { RootNavigator } from './navigation/StackNavigator';
import { authStore } from './store/authStore';
import { useTheme } from './hooks/useTheme';
import { initializeTheme } from './store/themeStore';
import AnimatedSplashScreen from './screens/auth/AnimatedSplashScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { friendsService } from './services/friends.service';
import { tournamentService } from './services/tournament.service';
import { dataSyncService } from './services/dataSync.service';

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(authStore.isAuthenticated);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    console.log('[App] Mounting, authentication state:', authStore.isAuthenticated);
    console.log('[App] Initial theme state:', { isDark, activeTheme: isDark ? 'dark' : 'light' });
    
    // Initialize theme from storage
    initializeTheme();

    // Initialize auth session
    const initAuth = async () => {
      await authStore.initialize();
      // Initialize services after auth is ready
      await initializeServices();
    };

    initAuth();

    // Subscribe to auth changes
    const unsubscribe = authStore.subscribe(() => {
      console.log('[App] Auth state changed:', authStore.isAuthenticated);
      setIsAuthenticated(authStore.isAuthenticated);
    });

    return () => {
      unsubscribe();
      // Cleanup services
      dataSyncService.cleanup();
    };
  }, []);

  const initializeServices = async () => {
    try {
      // Initialize friends service
      await friendsService.initialize();
      
      // Initialize tournament service
      await tournamentService.initialize();
      
      // Initialize data sync service
      await dataSyncService.initialize();
      
      console.log('[App] All services initialized successfully');
    } catch (error) {
      console.error('[App] Services initialization error:', error);
    }
  };

  const handleSplashFinish = () => {
    console.log('[App] Splash finished');
    setIsSplashVisible(false);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar 
            barStyle={isDark ? 'light-content' : 'dark-content'} 
            backgroundColor={colors.background}
          />
          
          {isSplashVisible ? (
            <AnimatedSplashScreen onFinish={handleSplashFinish} />
          ) : (
            <RootNavigator isAuthenticated={isAuthenticated} />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

