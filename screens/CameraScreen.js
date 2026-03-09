import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Vibration,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const scanAnimation = useRef(new Animated.Value(1)).current;

  // Анимация для рамки сканирования
  useEffect(() => {
    if (!scanned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [scanned]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Проверка разрешений...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={80} color="#075E54" />
        <Text style={styles.permissionText}>
          📷 Нужен доступ к камере для сканирования QR-кодов и приглашений в группы
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>РАЗРЕШИТЬ ДОСТУП</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Обработка сканированного QR-кода
  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;

    setScanned(true);
    Vibration.vibrate(100);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLastScanned(data);

    // Парсим QR-код для групп
    if (data.includes('aquafriend.group/')) {
      const groupId = data.split('/').pop();
      Alert.alert(
        '🎉 Приглашение в группу!',
        'Хотите присоединиться к группе?',
        [
          { 
            text: 'Отмена', 
            onPress: () => setScanned(false),
            style: 'cancel'
          },
          { 
            text: 'Присоединиться', 
            onPress: () => {
              // Переходим в чаты с параметром приглашения
              navigation.navigate('Чаты', { 
                screen: 'ChatList',
                params: { joinGroup: data }
              });
              setScanned(false);
              Alert.alert('✅ Вы присоединились к группе!');
            }
          }
        ]
      );
    } 
    // QR-код для добавления контакта
    else if (data.includes('aquafriend.user/')) {
      const userId = data.split('/').pop();
      Alert.alert(
        '👤 Новый контакт',
        `Добавить пользователя в контакты?`,
        [
          { text: 'Отмена', onPress: () => setScanned(false) },
          { 
            text: 'Добавить', 
            onPress: () => {
              setScanned(false);
              Alert.alert('✅ Контакт сохранен');
            }
          }
        ]
      );
    }
    // Ссылка на приложение
    else if (data.includes('aquafriend.app')) {
      Alert.alert(
        '📱 Aqua Friend',
        'Это ссылка на приложение! Хотите открыть?',
        [
          { text: 'Отмена', onPress: () => setScanned(false) },
          { 
            text: 'Открыть', 
            onPress: () => {
              setScanned(false);
              // Здесь можно открыть ссылку
            }
          }
        ]
      );
    }
    // Обычный текст или другой QR
    else {
      Alert.alert(
        '📄 QR-код считан',
        `Содержимое: ${data}`,
        [
          { 
            text: 'Копировать', 
            onPress: async () => {
              await Clipboard.setStringAsync(data);
              Alert.alert('✅ Скопировано в буфер обмена');
              setScanned(false);
            }
          },
          { text: 'Закрыть', onPress: () => setScanned(false) }
        ]
      );
    }
  };

  // Переключение фонарика
  const toggleTorch = () => {
    setTorch(!torch);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Приближение
  const toggleZoom = () => {
    setZoom(zoom === 0 ? 0.5 : 0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Показать информацию о том, что можно сканировать
  const showInfoModal = () => {
    setShowInfo(true);
  };

  return (
    <View style={styles.container}>
      {/* Камера */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'pdf417', 'aztec'],
        }}
        enableTorch={torch}
        zoom={zoom}
        animateShutter={false}
      />

      {/* Затемнение по краям для фокуса на рамке */}
      <View style={styles.mask}>
        <View style={styles.maskTop} />
        <View style={styles.maskCenter}>
          <View style={styles.maskLeft} />
          
          {/* Анимированная рамка сканирования */}
          <Animated.View 
            style={[
              styles.scanFrame,
              {
                transform: [{ scale: scanAnimation }]
              }
            ]}
          >
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            
            {/* Сканирующая линия */}
            {!scanned && (
              <Animated.View 
                style={[
                  styles.scanLine,
                  {
                    transform: [{
                      translateY: scanAnimation.interpolate({
                        inputRange: [1, 1.2],
                        outputRange: [0, 200]
                      })
                    }]
                  }
                ]} 
              />
            )}
          </Animated.View>
          
          <View style={styles.maskRight} />
        </View>
        <View style={styles.maskBottom}>
          <Text style={styles.hint}>
            {scanned 
              ? '✅ QR-код считан' 
              : '📷 Наведите на QR-код для приглашения в группу'}
          </Text>
        </View>
      </View>

      {/* Верхняя панель с кнопками */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.topButton} onPress={showInfoModal}>
          <Ionicons name="information-circle" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Нижняя панель с управлением */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomButton} onPress={toggleTorch}>
          <Ionicons 
            name={torch ? 'flash' : 'flash-off'} 
            size={28} 
            color="#FFF" 
          />
          <Text style={styles.buttonText}>
            {torch ? 'Выкл' : 'Вкл'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomButton} onPress={toggleZoom}>
          <Ionicons name="scan" size={28} color="#FFF" />
          <Text style={styles.buttonText}>
            {zoom === 0 ? '×1' : '×1.5'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.bottomButton, scanned && styles.activeButton]} 
          onPress={() => setScanned(false)}
        >
          <Ionicons 
            name={scanned ? 'refresh' : 'qr-code'} 
            size={28} 
            color="#FFF" 
          />
          <Text style={styles.buttonText}>
            {scanned ? 'Заново' : 'Скан'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Кнопка ручного ввода ссылки */}
      {!scanned && (
        <TouchableOpacity 
          style={styles.manualButton}
          onPress={() => {
            Alert.prompt(
              'Ввести код вручную',
              'Введите код приглашения',
              [
                { text: 'Отмена' },
                {
                  text: 'Применить',
                  onPress: (code) => {
                    if (code) {
                      Alert.alert('✅ Код применен', `Код: ${code}`);
                    }
                  }
                }
              ]
            );
          }}
        >
          <Ionicons name="keypad" size={20} color="#FFF" />
          <Text style={styles.manualText}>Ввести код</Text>
        </TouchableOpacity>
      )}

      {/* Модальное окно с информацией */}
      <Modal visible={showInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="qr-code" size={40} color="#075E54" />
              <Text style={styles.modalTitle}>Сканирование QR-кодов</Text>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.infoItem}>
                <Ionicons name="people" size={24} color="#075E54" />
                <Text style={styles.infoText}>
                  Приглашения в группы - сканируйте QR-код группы
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="person-add" size={24} color="#075E54" />
                <Text style={styles.infoText}>
                  Добавление контактов - QR-код пользователя
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="link" size={24} color="#075E54" />
                <Text style={styles.infoText}>
                  Ссылки на приложение - открывают Aqua Friend
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="text" size={24} color="#075E54" />
                <Text style={styles.infoText}>
                  Любой текст - можно скопировать в буфер
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowInfo(false)}
            >
              <Text style={styles.modalButtonText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Индикатор последнего сканирования */}
      {lastScanned && !scanned && (
        <TouchableOpacity 
          style={styles.lastScan}
          onPress={() => {
            Alert.alert('Последний QR-код', lastScanned);
          }}
        >
          <Ionicons name="time" size={16} color="#FFF" />
          <Text style={styles.lastScanText} numberOfLines={1}>
            Последний: {lastScanned.substring(0, 30)}...
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  permissionText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  permissionBtn: {
    backgroundColor: '#075E54',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Маска для фокуса на рамке
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  maskTop: {
    flex: 1,
  },
  maskCenter: {
    flexDirection: 'row',
    height: 250,
  },
  maskLeft: {
    flex: 1,
  },
  maskRight: {
    flex: 1,
  },
  maskBottom: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  
  // Рамка сканирования
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00FF00',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00FF00',
    opacity: 0.8,
  },
  hint: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    overflow: 'hidden',
  },
  
  // Верхняя панель
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Нижняя панель
  bottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bottomButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 70,
  },
  activeButton: {
    backgroundColor: '#075E54',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Кнопка ручного ввода
  manualButton: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  manualText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Модальное окно с информацией
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#075E54',
    marginTop: 10,
  },
  modalBody: {
    gap: 15,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#075E54',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Последнее сканирование
  lastScan: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 25,
    gap: 8,
  },
  lastScanText: {
    flex: 1,
    color: '#FFF',
    fontSize: 12,
  },
});