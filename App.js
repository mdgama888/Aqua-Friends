import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { 
  useColorScheme, 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  Easing
} from 'react-native-reanimated';

// Импорт экранов (с ленивой загрузкой)
const ChatList = React.lazy(() => import('./screens/ChatList'));
const CameraScreen = React.lazy(() => import('./screens/CameraScreen'));
const SettingsScreen = React.lazy(() => import('./screens/SettingsScreen'));
const ChatScreen = React.lazy(() => import('./screens/ChatScreen'));
const GroupInfoScreen = React.lazy(() => import('./screens/GroupInfoScreen'));
const CallScreen = React.lazy(() => import('./screens/CallScreen'));

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Константы
const COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  secondary: '#25D366',
  dark: '#075E54',
  light: '#DCF8C6',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#999999',
  lightGray: '#F0F0F0',
  error: '#DC3545',
  success: '#28A745',
};

// Компонент для ленивой загрузки с плейсхолдером
const LazyScreen = ({ component: Component, ...props }) => (
  <React.Suspense fallback={
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  }>
    <Component {...props} />
  </React.Suspense>
);

// Анимированный заголовок с градиентом
const AnimatedHeader = ({ title, onBack }) => {
  const rotateAnimation = useSharedValue(0);
  
  useEffect(() => {
    rotateAnimation.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 2000, easing: Easing.ease }),
        withTiming(-10, { duration: 2000, easing: Easing.ease })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rotateAnimation.value }]
  }));

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <SafeAreaView>
        <View style={styles.headerContent}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <Animated.Text style={[styles.headerTitle, animatedStyle]}>
            {title}
          </Animated.Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

// Компонент для экрана авторизации с анимацией
const AuthScreen = ({ onLogin }) => {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 1000 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight]}
      style={styles.authContainer}
    >
      <StatusBar barStyle="light-content" />
      <Animated.View 
        style={[styles.authContent, animatedStyle]}
        entering={FadeIn.duration(1000)}
        exiting={FadeOut.duration(500)}
      >
        <Animated.Text 
          style={styles.authIcon}
          entering={SlideInDown.delay(200).springify()}
        >
          🐠
        </Animated.Text>
        
        <Animated.Text 
          style={styles.authTitle}
          entering={SlideInDown.delay(400).springify()}
        >
          Aqua Friend
        </Animated.Text>
        
        <Animated.Text 
          style={styles.authSubtitle}
          entering={SlideInDown.delay(600).springify()}
        >
          Мессенджер для аквариумистов
        </Animated.Text>
        
        <Animated.View entering={SlideInDown.delay(800).springify()}>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={onLogin}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.white, '#f0f0f0']}
              style={styles.authButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.authButtonText}>Войти как гость</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.biometricButton}>
          <Ionicons name="finger-print" size={32} color={COLORS.white} />
          <Text style={styles.biometricText}>Войти с биометрией</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

// Стек для чатов с анимацией
function ChatStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen 
        name="ChatList" 
        children={(props) => (
          <LazyScreen component={ChatList} {...props} />
        )}
      />
      <Stack.Screen 
        name="Chat" 
        children={(props) => (
          <LazyScreen component={ChatScreen} {...props} />
        )}
      />
      <Stack.Screen 
        name="GroupInfo" 
        children={(props) => (
          <LazyScreen component={GroupInfoScreen} {...props} />
        )}
      />
      <Stack.Screen 
        name="Call" 
        children={(props) => (
          <LazyScreen component={CallScreen} {...props} />
        )}
        options={{
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Главный компонент
export default function App() {
  const scheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricType, setBiometricType] = useState(null);
  const [error, setError] = useState(null);

  // Мемоизация темы
  const theme = useMemo(() => 
    scheme === 'dark' ? DarkTheme : DefaultTheme,
    [scheme]
  );

  // Проверка авторизации
  const checkAuth = useCallback(async () => {
    try {
      const [user, biometricEnabled] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('biometricEnabled')
      ]);
      
      if (user) {
        if (biometricEnabled === 'true') {
          await authenticateWithBiometrics();
        } else {
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Биометрическая аутентификация
  const authenticateWithBiometrics = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setIsAuthenticated(true);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const type = types.includes(1) ? 'Touch ID' : types.includes(2) ? 'Face ID' : null;
      setBiometricType(type);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Вход в Aqua Friend ${type ? `с ${type}` : ''}`,
        fallbackLabel: 'Использовать пароль',
        disableDeviceFallback: false,
        cancelLabel: 'Отмена',
      });
      
      setIsAuthenticated(result.success);
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert(
        'Ошибка биометрии',
        'Не удалось выполнить биометрическую аутентификацию',
        [{ text: 'OK', onPress: () => setIsAuthenticated(true) }]
      );
    }
  }, []);

  // Обработчик входа
  const handleLogin = useCallback(async () => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify({ 
        name: 'User',
        id: Date.now().toString(),
        loginTime: new Date().toISOString()
      }));
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      setError('Ошибка при входе');
    }
  }, []);

  // Эффект для проверки авторизации
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Показ загрузки
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  // Показ ошибки
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            checkAuth();
          }}
        >
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Экран авторизации
  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // Основное приложение
  return (
    <NavigationContainer theme={theme}>
      <StatusBar 
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              'Чаты': focused ? 'chatbubbles' : 'chatbubbles-outline',
              'Камера': focused ? 'camera' : 'camera-outline',
              'Настройки': focused ? 'settings' : 'settings-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.gray,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            height: Platform.OS === 'ios' ? 90 : 70,
            paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          },
          tabBarBackground: () => (
            <BlurView 
              intensity={90} 
              tint={scheme === 'dark' ? 'dark' : 'light'} 
              style={StyleSheet.absoluteFill} 
            />
          ),
          headerShown: false,
          tabBarHideOnKeyboard: true,
        })}
      >
        <Tab.Screen 
          name="Чаты" 
          children={() => <ChatStack />}
          options={{
            tabBarLabel: 'Чаты',
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        />
        <Tab.Screen 
          name="Камера" 
          children={() => <LazyScreen component={CameraScreen} />}
          options={{
            tabBarLabel: 'Камера',
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        />
        <Tab.Screen 
          name="Настройки" 
          children={() => <LazyScreen component={SettingsScreen} />}
          options={{
            tabBarLabel: 'Настройки',
            tabBarLabelStyle: styles.tabBarLabel,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Обновленные стили
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  authContainer: {
    flex: 1,
  },
  authContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authIcon: {
    fontSize: 100,
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  authSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 50,
  },
  authButton: {
    width: 250,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  authButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 10,
  },
  authButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  biometricButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  biometricText: {
    color: COLORS.white,
    fontSize: 14,
    marginTop: 5,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 16,
  },
  backButton: {
    padding: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
