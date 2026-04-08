import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { LeavesScreen } from './src/screens/LeavesScreen';
import { COLORS } from './src/constants/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Today: { focused: 'today', unfocused: 'today-outline' },
  History: { focused: 'calendar', unfocused: 'calendar-outline' },
  Leaves: { focused: 'airplane', unfocused: 'airplane-outline' },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.indigo,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Leaves" component={LeavesScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.indigo} />
      </View>
    );
  }

  return user ? <MainTabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: COLORS.indigo,
            background: COLORS.background,
            card: COLORS.surface,
            text: COLORS.textPrimary,
            border: COLORS.border,
            notification: COLORS.error,
          },
        }}
      >
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
