import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  BackHandler,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function CallScreen({ route, navigation }) {
  const { chat, isVideo = true } = route.params;
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [duration, setDuration] = useState(0);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Имитация соединения
    const connectTimeout = setTimeout(() => {
      setCallStatus('connected');
      startTimer();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2000);

    // Блокировка кнопки "Назад" во время звонка
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (callStatus === 'connected') {
        endCall();
        return true;
      }
      return false;
    });

    // Настройка аудио
    setupAudio();

    return () => {
      clearTimeout(connectTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
      backHandler.remove();
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
    } catch (error) {
      console.log('Audio setup error:', error);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    setCallStatus('ended');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Показываем сообщение о завершении
    Alert.alert(
      'Звонок завершен',
      `Длительность: ${formatDuration(duration)}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
    
    // Возвращаемся через секунду
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleCamera = () => {
    if (isVideo) {
      setIsFrontCamera(!isFrontCamera);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleVideo = () => {
    setRemoteVideoEnabled(!remoteVideoEnabled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addToContacts = () => {
    Alert.alert(
      'Добавить в контакты',
      `Сохранить ${chat.name} в контакты?`,
      [
        { text: 'Отмена' },
        { 
          text: 'Добавить', 
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ Контакт сохранен');
          }
        }
      ]
    );
  };

  // Рендер для видеозвонка
  const renderVideoCall = () => (
    <View style={styles.videoContainer}>
      {/* Видео собеседника (основное) */}
      <View style={styles.remoteVideo}>
        {remoteVideoEnabled ? (
          <View style={styles.remoteVideoPlaceholder}>
            <Text style={styles.videoPlaceholderText}>{chat.avatar || '👤'}</Text>
            <Text style={styles.videoPlaceholderName}>{chat.name}</Text>
          </View>
        ) : (
          <View style={styles.videoOff}>
            <Ionicons name="videocam-off" size={50} color="#FFF" />
            <Text style={styles.videoOffText}>Видео отключено</Text>
          </View>
        )}
      </View>

      {/* Своё видео (маленькое в углу) */}
      <View style={styles.localVideo}>
        <View style={styles.localVideoPlaceholder}>
          <Ionicons name="person" size={30} color="#FFF" />
        </View>
      </View>
    </View>
  );

  // Рендер для аудиозвонка
  const renderAudioCall = () => (
    <View style={styles.audioContainer}>
      <View style={styles.audioAvatar}>
        <Text style={styles.audioAvatarText}>{chat.avatar || '👤'}</Text>
      </View>
      <Text style={styles.audioName}>{chat.name}</Text>
      <Text style={styles.audioStatus}>
        {callStatus === 'connecting' ? 'Вызов...' : formatDuration(duration)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#075E54' }]}>
      {/* Статус звонка сверху */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {callStatus === 'connecting' ? '🔄 Соединение...' : '🟢 В разговоре'}
        </Text>
        {callStatus === 'connected' && (
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        )}
      </View>

      {/* Основной контент (видео или аудио) */}
      {isVideo ? renderVideoCall() : renderAudioCall()}

      {/* Кнопки управления снизу */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Микрофон */}
          <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
            <View style={[styles.controlCircle, isMuted && styles.controlActive]}>
              <Ionicons 
                name={isMuted ? 'mic-off' : 'mic'} 
                size={28} 
                color={isMuted ? '#FFF' : '#075E54'} 
              />
            </View>
            <Text style={styles.controlText}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          {/* Завершить звонок */}
          <TouchableOpacity style={styles.controlButton} onPress={endCall}>
            <View style={[styles.controlCircle, styles.endCallCircle]}>
              <Ionicons name="call" size={32} color="#FFF" />
            </View>
            <Text style={styles.controlText}>Завершить</Text>
          </TouchableOpacity>

          {/* Динамик */}
          <TouchableOpacity style={styles.controlButton} onPress={toggleSpeaker}>
            <View style={[styles.controlCircle, isSpeaker && styles.controlActive]}>
              <Ionicons 
                name={isSpeaker ? 'volume-high' : 'volume-medium'} 
                size={28} 
                color={isSpeaker ? '#FFF' : '#075E54'} 
              />
            </View>
            <Text style={styles.controlText}>
              {isSpeaker ? 'Speaker' : 'Earpiece'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Вторая строка кнопок (только для видео) */}
        {isVideo && (
          <View style={[styles.controlsRow, styles.secondRow]}>
            {/* Переключить камеру */}
            <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
              <View style={styles.controlCircle}>
                <Ionicons 
                  name={isFrontCamera ? 'camera-reverse' : 'camera'} 
                  size={28} 
                  color="#075E54" 
                />
              </View>
              <Text style={styles.controlText}>Камера</Text>
            </TouchableOpacity>

            {/* Включить/выключить видео */}
            <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
              <View style={[styles.controlCircle, !remoteVideoEnabled && styles.controlActive]}>
                <Ionicons 
                  name={remoteVideoEnabled ? 'videocam' : 'videocam-off'} 
                  size={28} 
                  color={!remoteVideoEnabled ? '#FFF' : '#075E54'} 
                />
              </View>
              <Text style={styles.controlText}>
                {remoteVideoEnabled ? 'Video on' : 'Video off'}
              </Text>
            </TouchableOpacity>

            {/* Добавить в контакты */}
            <TouchableOpacity style={styles.controlButton} onPress={addToContacts}>
              <View style={styles.controlCircle}>
                <Ionicons name="person-add" size={28} color="#075E54" />
              </View>
              <Text style={styles.controlText}>Контакт</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Кнопка закрытия (только для connecting) */}
      {callStatus === 'connecting' && (
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  statusText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  durationText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderRadius: 15,
  },
  
  // Видео звонок
  videoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  remoteVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoPlaceholder: {
    alignItems: 'center',
  },
  videoPlaceholderText: {
    fontSize: 100,
    color: '#FFF',
    marginBottom: 20,
  },
  videoPlaceholderName: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '600',
  },
  videoOff: {
    alignItems: 'center',
  },
  videoOffText: {
    color: '#FFF',
    fontSize: 18,
    marginTop: 10,
  },
  localVideo: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    width: 100,
    height: 150,
    backgroundColor: '#333',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#075E54',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Аудио звонок
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  audioAvatarText: {
    fontSize: 70,
    color: '#FFF',
  },
  audioName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  audioStatus: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  
  // Кнопки управления
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  secondRow: {
    marginTop: 20,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  controlActive: {
    backgroundColor: '#075E54',
  },
  endCallCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#D32F2F',
  },
  controlText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Кнопка закрытия
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});