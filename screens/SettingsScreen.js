import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState({
    name: 'Алексей',
    phone: '+7 (999) 123-45-67',
    avatar: 'https://i.pravatar.cc/150?img=1',
    status: '🐠 Люблю аквариумистику',
    bio: 'Аквариумист со стажем. Держу неонов, гуппи и скалярий.'
  });

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editStatus, setEditStatus] = useState(user.status);
  const [editBio, setEditBio] = useState(user.bio);

  // Загрузка настроек
  useEffect(() => {
    loadSettings();
    checkBiometrics();
  }, []);

  const loadSettings = async () => {
    try {
      const bio = await AsyncStorage.getItem('biometricEnabled');
      setBiometricEnabled(bio === 'true');
      
      const notif = await AsyncStorage.getItem('notificationsEnabled');
      setNotificationsEnabled(notif !== 'false');
      
      const dark = await AsyncStorage.getItem('darkMode');
      setDarkMode(dark === 'true');
      
      const download = await AsyncStorage.getItem('autoDownload');
      setAutoDownload(download !== 'false');
      
      const receipts = await AsyncStorage.getItem('readReceipts');
      setReadReceipts(receipts !== 'false');
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.log('Error saving setting:', error);
    }
  };

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (hasHardware) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(1)) setBiometricType('Touch ID');
      else if (types.includes(2)) setBiometricType('Face ID');
      else setBiometricType('Биометрия');
    }
  };

  const toggleBiometric = async (value) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Подтвердите действие',
        fallbackLabel: 'Использовать пароль',
      });
      
      if (result.success) {
        setBiometricEnabled(true);
        saveSetting('biometricEnabled', true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Успешно', 'Биометрическая защита включена');
      }
    } else {
      setBiometricEnabled(false);
      saveSetting('biometricEnabled', false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleNotifications = (value) => {
    setNotificationsEnabled(value);
    saveSetting('notificationsEnabled', value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleDarkMode = (value) => {
    setDarkMode(value);
    saveSetting('darkMode', value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleAutoDownload = (value) => {
    setAutoDownload(value);
    saveSetting('autoDownload', value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleReadReceipts = (value) => {
    setReadReceipts(value);
    saveSetting('readReceipts', value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const changeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('❌ Ошибка', 'Нужен доступ к галерее');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUser({ ...user, avatar: result.assets[0].uri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Готово', 'Фото профиля обновлено');
    }
  };

  const saveProfile = () => {
    setUser({
      ...user,
      name: editName,
      status: editStatus,
      bio: editBio
    });
    setShowEditProfile(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ Готово', 'Профиль обновлен');
  };

  const logout = () => {
    Alert.alert(
      '🚪 Выход',
      'Точно выйти из аккаунта?',
      [
        { text: 'Отмена' },
        {
          text: 'Выйти',
          onPress: async () => {
            await AsyncStorage.removeItem('auth');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Здесь должен быть редирект на экран входа
            Alert.alert('👋 До свидания!', 'Вы вышли из аккаунта');
          },
          style: 'destructive'
        }
      ]
    );
  };

  const clearCache = () => {
    Alert.alert(
      '🗑️ Очистить кэш',
      'Удалить все временные файлы?',
      [
        { text: 'Отмена' },
        {
          text: 'Очистить',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ Готово', 'Кэш очищен');
          }
        }
      ]
    );
  };

  const inviteFriend = async () => {
    try {
      await Sharing.shareAsync({
        message: '🐠 Присоединяйся ко мне в Aqua Friend! Скачай приложение: https://aquafriend.app',
        title: 'Приглашение в Aqua Friend',
      });
    } catch (error) {
      console.log(error);
    }
  };

  const openLink = (url) => {
    Linking.openURL(url);
  };

  const copyUserInfo = async (text) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ Скопировано', 'Текст скопирован в буфер обмена');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Профиль */}
      <TouchableOpacity
        style={styles.profileSection}
        onPress={() => setShowEditProfile(true)}
      >
        <View style={styles.profileLeft}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userStatus}>{user.status}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>

      {/* Настройки аккаунта */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Аккаунт</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => copyUserInfo(user.phone)}>
          <Ionicons name="call-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Номер телефона</Text>
          <Text style={styles.menuValue}>{user.phone}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => copyUserInfo(user.bio)}>
          <Ionicons name="information-circle-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>О себе</Text>
          <Text style={styles.menuValue} numberOfLines={1}>{user.bio}</Text>
        </TouchableOpacity>
      </View>

      {/* Безопасность */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Безопасность</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowSecurity(true)}>
          <Ionicons name="lock-closed-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Конфиденциальность</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {biometricType && (
          <View style={styles.menuItem}>
            <Ionicons name="finger-print-outline" size={22} color="#075E54" />
            <Text style={styles.menuText}>{biometricType}</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: '#767577', true: '#075E54' }}
            />
          </View>
        )}
      </View>

      {/* Уведомления */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Уведомления</Text>
        
        <View style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Push-уведомления</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#767577', true: '#075E54' }}
          />
        </View>

        <View style={styles.menuItem}>
          <Ionicons name="volume-high-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Звук сообщений</Text>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: '#767577', true: '#075E54' }}
          />
        </View>

        <View style={styles.menuItem}>
          <Ionicons name="flash-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Вибрация</Text>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: '#767577', true: '#075E54' }}
          />
        </View>
      </View>

      {/* Чаты */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Чаты</Text>
        
        <View style={styles.menuItem}>
          <Ionicons name="cloud-download-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Авто-загрузка медиа</Text>
          <Switch
            value={autoDownload}
            onValueChange={toggleAutoDownload}
            trackColor={{ false: '#767577', true: '#075E54' }}
          />
        </View>

        <View style={styles.menuItem}>
          <Ionicons name="checkmark-done-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Отчеты о прочтении</Text>
          <Switch
            value={readReceipts}
            onValueChange={toggleReadReceipts}
            trackColor={{ false: '#767577', true: '#075E54' }}
          />
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={clearCache}>
          <Ionicons name="trash-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Очистить кэш</Text>
          <Text style={styles.menuValue}>128 MB</Text>
        </TouchableOpacity>
      </View>

      {/* Помощь */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Помощь</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={inviteFriend}>
          <Ionicons name="person-add-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Пригласить друга</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowAbout(true)}>
          <Ionicons name="information-circle-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>О приложении</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openLink('https://aquafriend.app/privacy')}>
          <Ionicons name="document-text-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Политика конфиденциальности</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openLink('https://aquafriend.app/terms')}>
          <Ionicons name="scale-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Условия использования</Text>
        </TouchableOpacity>
      </View>

      {/* Выход */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={24} color="#D32F2F" />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Версия 1.0.0 (build 2024.03.09)</Text>

      {/* Модалка редактирования профиля */}
      <Modal visible={showEditProfile} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditProfile(false)}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Редактировать профиль</Text>
            <TouchableOpacity onPress={saveProfile}>
              <Text style={styles.modalSave}>Сохранить</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity style={styles.avatarEdit} onPress={changeAvatar}>
              <Image source={{ uri: user.avatar }} style={styles.modalAvatar} />
              <View style={styles.avatarEditOverlay}>
                <Ionicons name="camera" size={30} color="#FFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Имя</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Введите имя"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Статус</Text>
              <TextInput
                style={styles.input}
                value={editStatus}
                onChangeText={setEditStatus}
                placeholder="Ваш статус"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>О себе</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Расскажите о себе"
                multiline
                numberOfLines={4}
                maxLength={200}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Модалка безопасности */}
      <Modal visible={showSecurity} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSecurity(false)}>
              <Ionicons name="arrow-back" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Конфиденциальность</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.securitySection}>
              <Text style={styles.securityTitle}>Кто может видеть</Text>
              
              <TouchableOpacity style={styles.securityItem}>
                <Text style={styles.securityLabel}>Мой номер телефона</Text>
                <Text style={styles.securityValue}>Все</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.securityItem}>
                <Text style={styles.securityLabel}>Фото профиля</Text>
                <Text style={styles.securityValue}>Мои контакты</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.securityItem}>
                <Text style={styles.securityLabel}>Статус онлайн</Text>
                <Text style={styles.securityValue}>Все</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.securityItem}>
                <Text style={styles.securityLabel}>Читательские подтверждения</Text>
                <Text style={styles.securityValue}>Вкл</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.securitySection}>
              <Text style={styles.securityTitle}>Блокировка</Text>
              
              <TouchableOpacity style={styles.securityItem}>
                <Text style={styles.securityLabel}>Заблокированные контакты</Text>
                <Text style={styles.securityValue}>0</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.securitySection}>
              <Text style={styles.securityTitle}>Данные</Text>
              
              <TouchableOpacity style={styles.securityItem}>
                <Text style={styles.securityLabel}>Экспортировать данные</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.securityItem}>
                <Text style={styles.securityLabel}>Удалить аккаунт</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Модалка о приложении */}
      <Modal visible={showAbout} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAbout(false)}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>О приложении</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.aboutHeader}>
              <View style={styles.appIcon}>
                <Text style={styles.appIconText}>🐠</Text>
              </View>
              <Text style={styles.appName}>Aqua Friend</Text>
              <Text style={styles.appVersion}>Версия 1.0.0</Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutText}>
                Aqua Friend - это современный мессенджер для аквариумистов с AI-помощником, 
                видеозвонками и защитой данных.
              </Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>Возможности:</Text>
              <Text style={styles.aboutBullet}>• AI-помощник Профессор Аква</Text>
              <Text style={styles.aboutBullet}>• Видео-кружочки как в Telegram</Text>
              <Text style={styles.aboutBullet}>• Групповые чаты</Text>
              <Text style={styles.aboutBullet}>• QR-сканер для приглашений</Text>
              <Text style={styles.aboutBullet}>• Face ID / Touch ID защита</Text>
              <Text style={styles.aboutBullet}>• Голосовые сообщения</Text>
              <Text style={styles.aboutBullet}>• Транскрипция голоса в текст</Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>Разработчик:</Text>
              <Text style={styles.aboutText}>Сделано с ❤️ для аквариумистов</Text>
            </View>

            <View style={styles.aboutSection}>
              <TouchableOpacity style={styles.aboutLink} onPress={() => openLink('https://aquafriend.app')}>
                <Text style={styles.aboutLinkText}>🌐 Сайт проекта</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.aboutLink} onPress={() => openLink('https://github.com/aquafriend')}>
                <Text style={styles.aboutLinkText}>💻 Исходный код</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  menuValue: {
    fontSize: 14,
    color: '#999',
    maxWidth: '40%',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  logoutText: {
    fontSize: 16,
    color: '#D32F2F',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginBottom: 30,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#075E54',
  },
  modalSave: {
    fontSize: 16,
    color: '#075E54',
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  avatarEdit: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  securitySection: {
    marginBottom: 25,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 10,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  securityLabel: {
    fontSize: 16,
    color: '#333',
  },
  securityValue: {
    fontSize: 14,
    color: '#999',
  },
  aboutHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  appIconText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: '#999',
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  aboutBullet: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
    marginLeft: 10,
  },
  aboutLink: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  aboutLinkText: {
    fontSize: 16,
    color: '#075E54',
  },
});