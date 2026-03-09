import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import BottomNav from './BottomNav.jsx';

// Sub-stacks can be defined here if needed (e.g., RoomDetail not in tab bar)
import IntelligentRoomScreen from '../screens/rooms/IntelligentRoomScreen'; 
import ThreatMapScreen from '../screens/ai-brain/ThreatMapScreen';
import DecisionEngineScreen from '../screens/ai-brain/DecisionEngineScreen';
import DataStreamScreen from '../screens/simulation/DataStreamScreen';
import SimulationHubScreen from '../screens/simulation/SimulationHubScreen.jsx';
import TrainingModeScreen from '../screens/simulation/TrainingModeScreen';
import SecurityScreen from '../screens/profile/SecurityScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AppAppearanceScreen from '../screens/settings/AppAppearanceScreen';
import GlobalConnectScreen from '../screens/connect/GlobalConnectScreen';
import GlobalVoiceScreen from '../screens/connect/GlobalVoiceScreen';
import GlobalChatScreen from '../screens/connect/GlobalChatScreen';
import InnerRoomScreen from '../screens/room/InnerRoomScreen';
import FriendsScreen from '../screens/friends/FriendsScreen.jsx';
import TournamentScreen from '../screens/games/TournamentScreen';
import GameRoomScreen from '../screens/games/GameRoomScreen';
import RecentActivityScreen from '../screens/command/RecentActivityScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = ({ isAuthenticated }) => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {!isAuthenticated ? (
        // Auth Flow
        <Stack.Group screenOptions={{ animation: 'slide_from_bottom' }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Group>
      ) : (
        // Main Flow
        <Stack.Group>
          <Stack.Screen name="Main" component={BottomNav} />
          <Stack.Screen 
              name="IntelligentRoom" 
              component={InnerRoomScreen} 
          />
          <Stack.Screen 
              name="ThreatMap" 
              component={ThreatMapScreen} 
              options={{ animation: 'fade_from_bottom' }}
          />
          <Stack.Screen name="DecisionEngine" component={DecisionEngineScreen} />
          <Stack.Screen name="DataStream" component={DataStreamScreen} />
          <Stack.Screen name="TrainingMode" component={TrainingModeScreen} />
          <Stack.Screen name="Security" component={SecurityScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="AppAppearance" component={AppAppearanceScreen} />
          <Stack.Screen name="GlobalConnect" component={GlobalConnectScreen} />
          <Stack.Screen name="GlobalVoice" component={GlobalVoiceScreen} />
          <Stack.Screen name="GlobalChat" component={GlobalChatScreen} />
          <Stack.Screen name="InnerRoom" component={InnerRoomScreen} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
          <Stack.Screen name="Tournament" component={TournamentScreen} />
          <Stack.Screen name="GameRoom" component={GameRoomScreen} />
          <Stack.Screen name="RecentActivity" component={RecentActivityScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

// End of StackNavigator
