import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {Provider as PaperProvider} from 'react-native-paper';
import {StatusBar} from 'react-native';

// Screens
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AISettingsScreen from './src/screens/AISettingsScreen';

// Theme
import {theme} from './src/utils/theme';

const Stack = createStackNavigator();

const App = () => {
  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.surface}
      />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="ChatList"
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: theme.colors.onPrimary,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen
            name="ChatList"
            component={ChatListScreen}
            options={{
              title: 'Messages',
              headerRight: () => null,
            }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({route}) => ({
              title: route.params?.chatName || 'Chat',
            })}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
            }}
          />
          <Stack.Screen
            name="AISettings"
            component={AISettingsScreen}
            options={{
              title: 'AI Settings',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;
