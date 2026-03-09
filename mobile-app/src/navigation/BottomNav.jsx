import React, { useRef, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { authStore } from '../store/authStore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { normalize } from '../utils/responsive';
import { useTheme } from '../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screen Imports
import SimulationHubScreen from '../screens/simulation/SimulationHubScreen.jsx';
import CommandHubScreen from '../screens/command/CommandHubScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import GlobalConnectScreen from '../screens/connect/GlobalConnectScreen.jsx';
import FriendsScreen from '../screens/friends/FriendsScreen.jsx';

const Tab = createBottomTabNavigator();

const TabIcon = ({ focused, name, nameFocused, library, label, color }) => {
  const IconComponent = library;
  
  return (
    <View style={styles.iconContainer}>
      <IconComponent 
          name={focused ? nameFocused : name} 
          size={normalize(25)} 
          color={color} 
      />
      {/* Label suppressed for premium visual focus */}
      {focused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
    </View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const tabWidth = containerWidth / state.routes.length;

  useEffect(() => {
    if (containerWidth > 0) {
      Animated.spring(translateX, {
        toValue: state.index * tabWidth,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }).start();
    }
  }, [state.index, containerWidth, tabWidth]);

  return (
    <View 
      style={[styles.tabBar, { 
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
      }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width - 20)}
    >
      {/* Sliding Background Bubble */}
      {containerWidth > 0 && (
        <Animated.View 
          style={[
            styles.activeBubble,
            {
              position: 'absolute',
              width: normalize(62),
              height: normalize(48),
              left: 10 + (tabWidth - normalize(62)) / 2,
              opacity: translateX.interpolate({
                // Fade out when entering the Global tab (index 2)
                inputRange: [tabWidth * 1.5, tabWidth * 2, tabWidth * 2.5],
                outputRange: [1, 0, 1],
                extrapolate: 'clamp'
              }),
              transform: [
                { translateX }, 
                { translateY: (normalize(65) - normalize(48)) / 2 - 2 } // Vertically centered
              ]
            }
          ]}
        />
      )}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? colors.primary : colors.textSecondary;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.8}
          >
             <View style={[
               styles.iconContainer, 
               isFocused && route.name === 'Global' && { backgroundColor: 'transparent' }
             ]}>
                {options.tabBarIcon({ 
                  focused: isFocused, 
                  color: isFocused && route.name !== 'Global' ? '#fff' : color, 
                  size: 24 
                })}
             </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const useAuth = () => {
    const [user, setUser] = useState(authStore.user);
    useEffect(() => {
        const unsubscribe = authStore.subscribe(() => {
            setUser(authStore.user);
        });
        return unsubscribe;
    }, []);
    return user;
};

const BottomNav = () => {
  const { colors, isDark } = useTheme();
  const user = useAuth();
  const profileImage = user?.profileImage;

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={CommandHubScreen} 
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              focused={focused} 
              library={Ionicons} 
              name="home-outline" 
              nameFocused="home"
              label="Home" 
              color={color} 
            />
          ),
        }}
      />

      <Tab.Screen 
        name="Spaces" 
        component={FriendsScreen} // Matching mockup "Spaces" to friends/groups for now
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              focused={focused} 
              library={MaterialCommunityIcons} 
              name="view-grid-outline" 
              nameFocused="view-grid"
              label="Spaces" 
              color={color} 
            />
          ),
        }}
      />

      <Tab.Screen 
        name="Global" 
        component={GlobalConnectScreen} 
        options={{
          tabBarIcon: ({ focused, color }) => (
            <View style={[
                styles.globalTabContainer,
                { backgroundColor: '#0B1F3A', borderColor: isDark ? '#101922' : '#FFFFFF' }
            ]}>
                <LinearGradient
                  colors={['#123B6D', '#0B1F3A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.globalGradient}
                >
                    <Ionicons name="globe-outline" size={normalize(34)} color="#fff" />
                </LinearGradient>
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Games" 
        component={SimulationHubScreen} 
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              focused={focused} 
              library={Ionicons} 
              name="game-controller-outline" 
              nameFocused="game-controller"
              label="Games" 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ focused, color }) => {
            if (profileImage) {
                 return (
                    <View style={styles.iconContainer}>
                        <View style={[styles.avatarWrapper, focused && { borderColor: color }]}>
                            <Image source={{ uri: profileImage }} style={styles.avatar} />
                        </View>
                        <Text style={[styles.iconLabel, { color: focused ? color : '#6B7280' }]}>Profile</Text>
                        {focused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
                    </View>
                 );
            }
            return (
                <TabIcon 
                  focused={focused} 
                  library={Ionicons} 
                  name="person-outline" 
                  nameFocused="person"
                  label="Profile" 
                  color={color}
                />
            );
          }
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: normalize(20),
    left: normalize(20),
    right: normalize(20),
    borderRadius: normalize(40),
    height: normalize(65),
    borderWidth: 1.5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    paddingHorizontal: 10,
    // Note: Blur is handled by background opacity + platform specifics if needed
    // In RN, we usually use a blur view if available, otherwise high opacity
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: normalize(45),
    height: normalize(45),
    borderRadius: normalize(22.5),
  },
  activeBubble: {
    backgroundColor: '#0B1F3A',
    width: normalize(52),
    height: normalize(48),
    borderRadius: normalize(24),
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -normalize(4) }],
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  iconLabel: {
    fontSize: normalize(10),
    marginTop: 2, 
    fontWeight: '700',
    textAlign: 'center',
  },
  activeIndicator: {
    // Hidden in this design as we use active bubble
    display: 'none',
  },
  avatarWrapper: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: normalize(12),
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  globalTabContainer: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
    marginTop: -normalize(35),
    overflow: 'hidden',
    borderWidth: 4,
    elevation: 8,
    shadowColor: '#2F6BFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  globalGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default BottomNav;
