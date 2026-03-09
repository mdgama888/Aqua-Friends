import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Импорт экранов
import ChatList from './screens/ChatList';
import CameraScreen from './screens/CameraScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChatScreen from './screens/ChatScreen';
import GroupInfoScreen from './screens/GroupInfoScreen';
import CallScreen from './screens/CallScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Стек для чатов (включает список чатов, сам чат, инфо о группе и звонки)
function ChatStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTransparent: true,
        headerBackground: () => (
          <BlurView intensity={50} style={StyleSheet.absoluteFill} />
        ),
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="ChatList" 
        component={ChatList} 
        options={{ 
          title: 'Чаты',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ 
          title: '',
          headerBackTitle: 'Назад',
        }} 
      />
      <Stack.Screen 
        name="GroupInfo" 
        component={GroupInfoScreen} 
        options={{ 
          title: 'Информация о группе',
        }} 
      />
      <Stack.Screen 
        name="Call" 
        component={CallScreen} 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack.Navigator>
  );
}

// Главный компонент с табами
export default function App() {
  const scheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricType, setBiometricType] = useState(null);

  // Проверка авторизации и биометрии при запуске
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Проверяем, есть ли сохраненная сессия
      const user = await AsyncStorage.getItem('user');
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      
      if (user) {
        // Если включена биометрия - проверяем
        if (biometricEnabled === 'true') {
          await authenticateWithBiometrics();
        } else {
          setIsAuthenticated(true);
        }
      } else {
        // Нет пользователя - показываем вход
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(1)) setBiometricType('Touch ID');
        else if (types.includes(2)) setBiometricType('Face ID');
        
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Вход в Aqua Friend',
          fallbackLabel: 'Использовать пароль',
          disableDeviceFallback: false,
        });
        
        setIsAuthenticated(result.success);
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log('Biometric error:', error);
      setIsAuthenticated(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authIcon}>🐠</Text>
        <Text style={styles.authTitle}>Aqua Friend</Text>
        <Text style={styles.authSubtitle}>Мессенджер для аквариумистов</Text>
        
        <TouchableOpacity 
          style={styles.authButton}
          onPress={async () => {
            await AsyncStorage.setItem('user', JSON.stringify({ name: 'User' }));
            setIsAuthenticated(true);
          }}
        >
          <Text style={styles.authButtonText}>Войти как гость</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Чаты') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Камера') {
              iconName = focused ? 'qr-code' : 'qr-code-outline';
            } else if (route.name === 'Настройки') {
              iconName = focused ? 'settings' : 'settings-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#075E54',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            height: 60,
          },
          tabBarBackground: () => (
            <BlurView 
              intensity={80} 
              tint={scheme === 'dark' ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFill} 
            />
          ),
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="Чаты" 
          component={ChatStack} 
          options={{
            tabBarLabel: 'Чаты',
          }}
        />
        <Tab.Screen 
          name="Камера" 
          component={CameraScreen} 
          options={{
            tabBarLabel: 'Камера',
          }}
        />
        <Tab.Screen 
          name="Настройки" 
          component={SettingsScreen} 
          options={{
            tabBarLabel: 'Настройки',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075E54',
    padding: 20,
  },
  authIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  authSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 40,
  },
  authButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  authButtonText: {
    color: '#075E54',
    fontSize: 16,
    fontWeight: '600',
  },
});