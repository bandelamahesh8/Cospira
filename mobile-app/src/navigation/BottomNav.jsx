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
import SimulationHubScreen from '../screens/simulation/SimulationHubScreen';
import CommandHubScreen from '../screens/command/CommandHubScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import GlobalConnectScreen from '../screens/connect/GlobalConnectScreen';
import FriendsScreen from '../screens/friends/FriendsScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ focused, name, nameFocused, library, label, color }) => {
  const IconComponent = library;
  
  return (
    <View style={styles.iconContainer}>
      <IconComponent 
          name={focused ? nameFocused : name} 
          size={normalize(24)} 
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

  return (
    <View style={[styles.tabBar, { 
      backgroundColor: isDark ? colors.surface : colors.background,
      borderTopColor: isDark ? colors.border : '#E5E7EB',
      paddingBottom: Math.max(insets.bottom, 10),
      height: 60 + Math.max(insets.bottom, 10)
    }]}>
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
            activeOpacity={0.7}
          >
             {options.tabBarIcon({ focused: isFocused, color, size: 24 })}
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
        name="Hub" 
        component={CommandHubScreen} 
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              focused={focused} 
              library={Ionicons} 
              name="grid-outline" 
              nameFocused="grid"
              label="Hub" 
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
                { backgroundColor: colors.primary, borderColor: isDark ? '#0B0D12' : '#FFFFFF' }
            ]}>
                <LinearGradient
                  colors={['#8B5CF6', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.globalGradient}
                >
                    <Ionicons name="flash" size={normalize(28)} color="#fff" />
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
        name="Friends" 
        component={FriendsScreen} 
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon 
              focused={focused} 
              library={Ionicons} 
              name="people-outline" 
              nameFocused="people"
              label="Friends" 
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
    // Height and padding are now dynamic handled in the component
    borderTopWidth: 1,
    elevation: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  iconLabel: {
    fontSize: normalize(10),
    marginTop: 4, 
    fontWeight: '500',
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2, // Moved up slightly
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  avatarWrapper: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  globalTabContainer: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    marginTop: -normalize(20),
    overflow: 'hidden',
    borderWidth: 4,
    // borderColor: '#0B0D12', // Moved to dynamic style
    elevation: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  globalGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BottomNav;
