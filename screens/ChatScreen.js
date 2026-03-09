import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Swipeable } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');

// Конфигурация OpenAI для транскрипции (вставь свой ключ)
const OPENAI_API_KEY = 'sk-...'; // ВСТАВЬ СВОЙ API КЛЮЧ

export default function ChatScreen({ route, navigation }) {
  const { chat } = route.params;
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Привет! Я твой ИИ-помощник. Могу перевести голос в текст, отправить видео-кружочек или просто поболтать!',
      sender: 'other',
      senderName: 'AI Assistant',
      time: '14:20',
      status: 'read'
    },
    {
      id: '2',
      text: 'Круто! А что такое видео-кружочки?',
      sender: 'me',
      senderName: 'Я',
      time: '14:21',
      status: 'read'
    },
    {
      id: '3',
      text: 'Это как в Telegram - круглые видео, которые можно записать прямо в чате! Нажми и держи кнопку с камерой 🎥',
      sender: 'other',
      senderName: 'AI Assistant',
      time: '14:22',
      status: 'read'
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState('front');
  const [replyTo, setReplyTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const cameraRef = useRef(null);
  const flatListRef = useRef();
  const typingTimeout = useRef(null);
  const swipeableRefs = useRef(new Map());
  const videoRef = useRef(null);

  // Настройка заголовка
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity 
          style={styles.headerTitle}
          onPress={() => chat.isGroup && navigation.navigate('GroupInfo', { group: chat })}
        >
          <Text style={styles.headerName}>{chat.name}</Text>
          {isTyping && (
            <View style={styles.typingContainer}>
              <LottieView
                source={require('../assets/typing.json')}
                autoPlay
                loop
                style={styles.typingAnimation}
              />
              <Text style={styles.typingText}>печатает...</Text>
            </View>
          )}
          {!isTyping && chat.isGroup && (
            <Text style={styles.headerSub}>{chat.participants} участников</Text>
          )}
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => startCall('audio')} style={styles.headerButton}>
            <Ionicons name="call" size={22} color="#075E54" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => startCall('video')} style={styles.headerButton}>
            <Ionicons name="videocam" size={22} color="#075E54" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={22} color="#075E54" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [isTyping]);

  // Симуляция "печатает" от собеседника
  const simulateTyping = () => {
    setIsTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
  };

  // Отправка сообщения
  const sendMessage = async (data) => {
    const newMsg = {
      id: Date.now().toString(),
      ...data,
      sender: 'me',
      senderName: 'Я',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      replyTo: replyTo ? {
        id: replyTo.id,
        text: replyTo.text,
        senderName: replyTo.senderName
      } : null
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setReplyTo(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Прокрутка вниз
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    // Ответ AI (если это не системное сообщение)
    if (data.text && !data.isSystem) {
      simulateTyping();
      setTimeout(() => aiReply(data.text), 2000);
    }
  };

  // Ответ AI
  const aiReply = (userText) => {
    let reply = '';
    if (userText.includes('?')) {
      reply = 'Отличный вопрос! Дай подумать... 🤔';
    } else if (userText.includes('привет') || userText.includes('здравствуй')) {
      reply = 'Привет! Как дела? 🐠';
    } else if (userText.includes('кружоч') || userText.includes('видео')) {
      reply = 'Видео-кружочки - это как в Telegram! Нажми и держи кнопку с камерой 🎥';
    } else {
      reply = `Интересно! Я понял: "${userText}". Чем ещё помочь?`;
    }

    const aiMsg = {
      id: Date.now().toString() + 'ai',
      text: reply,
      sender: 'other',
      senderName: 'AI Assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Транскрипция голоса в текст (Whisper API)
  const transcribeAudio = async (uri) => {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-...') {
      // Демо-режим без API
      setTimeout(() => {
        setMessages(prev => prev.map(m =>
          m.uri === uri ? { ...m, text: 'Это демо-транскрипция. Вставь свой OpenAI ключ для реальной работы!' } : m
        ));
        setIsTranscribing(false);
      }, 2000);
      return;
    }

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'audio.m4a'
      });
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData
      });

      const data = await response.json();
      
      setMessages(prev => prev.map(m =>
        m.uri === uri ? { ...m, text: data.text, transcribed: true } : m
      ));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('Ошибка', 'Не удалось распознать голос');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Запись голоса
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Нужен доступ к микрофону');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    const voiceMsg = {
      id: Date.now().toString(),
      uri,
      type: 'audio',
      sender: 'me',
      senderName: 'Я',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: '0:03',
      status: 'sent'
    };

    setMessages(prev => [...prev, voiceMsg]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Запускаем транскрипцию
    transcribeAudio(uri);
  };

  // Видео-кружочки
  const startVideoNote = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setShowCamera(true);
      setIsRecordingVideo(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const stopVideoNote = async () => {
    if (cameraRef.current && isRecordingVideo) {
      try {
        const video = await cameraRef.current.recordAsync();
        setShowCamera(false);
        setIsRecordingVideo(false);

        const videoMsg = {
          id: Date.now().toString(),
          uri: video.uri,
          type: 'video',
          isVideoNote: true,
          sender: 'me',
          senderName: 'Я',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: '0:05',
          status: 'sent'
        };

        setMessages(prev => [...prev, videoMsg]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Video recording error:', error);
      }
    }
  };

  // Выбор фото из галереи
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Нужен доступ к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        sendMessage({
          uri: result.assets[0].uri,
          type: 'image'
        });
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  // Выбор видео из галереи
  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Нужен доступ к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        sendMessage({
          uri: result.assets[0].uri,
          type: 'video',
          isVideoNote: false
        });
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось выбрать видео');
    }
  };

  // Отправка геолокации
  const sendLocation = () => {
    Alert.alert(
      '📍 Геолокация',
      'Отправить текущее местоположение?',
      [
        { text: 'Отмена' },
        {
          text: 'Отправить',
          onPress: () => {
            sendMessage({
              type: 'location',
              location: 'Москва, Россия',
              latitude: 55.7558,
              longitude: 37.6173
            });
          }
        }
      ]
    );
  };

  // Отправка контакта
  const sendContact = () => {
    Alert.alert(
      '👤 Отправить контакт',
      'Выберите контакт',
      [
        { text: 'Отмена' },
        {
          text: 'Мой контакт',
          onPress: () => {
            sendMessage({
              type: 'contact',
              contactName: 'Я',
              contactPhone: '+7 (999) 123-45-67'
            });
          }
        }
      ]
    );
  };

  // Создание опроса
  const createPoll = () => {
    Alert.prompt(
      '📊 Создать опрос',
      'Введите вопрос и варианты через запятую\nНапример: "Любимая рыба? Неон,Гуппи,Скалярия"',
      [
        { text: 'Отмена' },
        {
          text: 'Создать',
          onPress: (text) => {
            const parts = text.split(',').map(s => s.trim());
            const question = parts[0];
            const options = parts.slice(1).map(opt => ({ text: opt, votes: 0 }));

            if (question && options.length > 0) {
              sendMessage({
                type: 'poll',
                question,
                options,
                isSystem: true
              });
            }
          }
        }
      ]
    );
  };

  // Действия с сообщением
  const handleMessagePress = (item) => {
    setSelectedMessage(item);
    setShowActions(true);
  };

  // Ответ на сообщение
  const handleReply = () => {
    setReplyTo(selectedMessage);
    setShowActions(false);
  };

  // Переслать сообщение
  const handleForward = async () => {
    try {
      if (selectedMessage.text) {
        await Sharing.shareAsync(selectedMessage.text);
      } else if (selectedMessage.uri) {
        await Sharing.shareAsync(selectedMessage.uri);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось переслать');
    }
    setShowActions(false);
  };

  // Копировать текст
  const handleCopy = async () => {
    if (selectedMessage.text) {
      await Clipboard.setStringAsync(selectedMessage.text);
      Alert.alert('✅ Скопировано');
    }
    setShowActions(false);
  };

  // Удалить сообщение
  const handleDelete = () => {
    Alert.alert(
      '🗑️ Удалить сообщение',
      'Удалить для всех?',
      [
        { text: 'Только у меня', onPress: () => {
          setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }},
        {
          text: 'У всех',
          onPress: () => {
            setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ Сообщение удалено у всех');
          },
          style: 'destructive'
        },
        { text: 'Отмена' }
      ]
    );
    setShowActions(false);
  };

  // Добавить реакцию
  const addReaction = (emoji) => {
    setMessages(prev => prev.map(m => {
      if (m.id === selectedMessage.id) {
        const reactions = m.reactions || [];
        const existing = reactions.find(r => r.emoji === emoji);
        if (existing) {
          existing.count++;
        } else {
          reactions.push({ emoji, count: 1 });
        }
        return { ...m, reactions };
      }
      return m;
    }));
    setShowActions(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Звонок
  const startCall = (type) => {
    Alert.alert(
      type === 'video' ? '📹 Видеозвонок' : '📞 Аудиозвонок',
      `Начать с ${chat.name}?`,
      [
        { text: 'Отмена' },
        {
          text: 'Позвонить',
          onPress: () => navigation.navigate('Call', { chat, isVideo: type === 'video' })
        }
      ]
    );
  };

  // Рендер сообщения
  const renderMessage = ({ item }) => {
    const isMe = item.sender === 'me';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => handleMessagePress(item)}
        delayLongPress={500}
      >
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
          {/* Информация об отправителе (для групп) */}
          {chat.isGroup && !isMe && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}

          {/* Блок ответа на сообщение */}
          {item.replyTo && (
            <TouchableOpacity 
              style={styles.replyContainer}
              onPress={() => {
                // Прокрутка к исходному сообщению
                const index = messages.findIndex(m => m.id === item.replyTo.id);
                if (index !== -1) {
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                }
              }}
            >
              <View style={styles.replyLine} />
              <View style={styles.replyContent}>
                <Text style={styles.replySender}>{item.replyTo.senderName}</Text>
                <Text style={styles.replyText} numberOfLines={1}>{item.replyTo.text}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Контент сообщения */}
          <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
            {/* Текст */}
            {item.text && (
              <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                {item.text}
              </Text>
            )}

            {/* Фото */}
            {item.type === 'image' && (
              <TouchableOpacity onPress={() => navigation.navigate('ImageViewer', { uri: item.uri })}>
                <Image source={{ uri: item.uri }} style={styles.messageImage} />
              </TouchableOpacity>
            )}

            {/* Видео */}
            {item.type === 'video' && (
              <TouchableOpacity 
                style={styles.videoContainer}
                onPress={() => navigation.navigate('VideoPlayer', { uri: item.uri })}
              >
                <Image 
                  source={{ uri: item.uri }} 
                  style={[styles.messageImage, item.isVideoNote && styles.videoNote]} 
                />
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={50} color="#FFF" />
                </View>
                {item.isVideoNote && (
                  <View style={styles.videoNoteBadge}>
                    <Text style={styles.videoNoteText}>🎥 Кружочек</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Аудио */}
            {item.type === 'audio' && (
              <View style={styles.audioContainer}>
                <TouchableOpacity 
                  style={styles.audioPlayButton}
                  onPress={async () => {
                    const { sound } = await Audio.Sound.createAsync({ uri: item.uri });
                    await sound.playAsync();
                  }}
                >
                  <Ionicons name="play" size={24} color={isMe ? '#075E54' : '#FFF'} />
                </TouchableOpacity>
                <View style={styles.audioInfo}>
                  <View style={styles.audioWave}>
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <View 
                        key={i} 
                        style={[
                          styles.waveBar, 
                          { height: 10 + Math.random() * 20 }
                        ]} 
                      />
                    ))}
                  </View>
                  <Text style={styles.audioDuration}>{item.duration || '0:03'}</Text>
                </View>
                {isTranscribing && item.uri && !item.text && (
                  <ActivityIndicator size="small" color="#075E54" style={styles.transcribingIcon} />
                )}
                {item.transcribed && (
                  <Ionicons name="sparkles" size={16} color="#075E54" style={styles.transcribedIcon} />
                )}
              </View>
            )}

            {/* Геолокация */}
            {item.type === 'location' && (
              <TouchableOpacity style={styles.locationContainer}>
                <Ionicons name="map" size={40} color="#075E54" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationTitle}>📍 Местоположение</Text>
                  <Text style={styles.locationAddress}>{item.location}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Контакт */}
            {item.type === 'contact' && (
              <TouchableOpacity style={styles.contactContainer}>
                <Ionicons name="person-circle" size={40} color="#075E54" />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.contactName}</Text>
                  <Text style={styles.contactPhone}>{item.contactPhone}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Опрос */}
            {item.type === 'poll' && (
              <View style={styles.pollContainer}>
                <Text style={styles.pollQuestion}>{item.question}</Text>
                {item.options.map((opt, idx) => (
                  <TouchableOpacity key={idx} style={styles.pollOption}>
                    <View style={styles.pollOptionRow}>
                      <Text style={styles.pollOptionText}>{opt.text}</Text>
                      <Text style={styles.pollPercentage}>{opt.votes || 0}%</Text>
                    </View>
                    <View style={styles.pollBar}>
                      <View style={[styles.pollProgress, { width: `${opt.votes || 0}%` }]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Реакции */}
            {item.reactions && item.reactions.length > 0 && (
              <View style={styles.reactionsContainer}>
                {item.reactions.map((r, i) => (
                  <View key={i} style={styles.reaction}>
                    <Text>{r.emoji} {r.count}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer сообщения */}
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>{item.time}</Text>
              {isMe && (
                <Ionicons
                  name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                  size={16}
                  color={item.status === 'read' ? '#34B7F1' : '#999'}
                  style={styles.messageStatus}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Меню действий с сообщением
  const renderActionMenu = () => (
    <Modal visible={showActions} transparent animationType="fade">
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowActions(false)}
      >
        <View style={styles.actionMenu}>
          <View style={styles.actionMenuHeader}>
            <Text style={styles.actionMenuTitle}>Действия</Text>
            <TouchableOpacity onPress={() => setShowActions(false)}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.reactionsRow}>
            {['❤️', '😂', '😮', '😢', '👍'].map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionButton}
                onPress={() => addReaction(emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.actionMenuItem} onPress={handleReply}>
            <Ionicons name="arrow-undo" size={24} color="#075E54" />
            <Text style={styles.actionMenuText}>Ответить</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionMenuItem} onPress={handleForward}>
            <Ionicons name="arrow-redo" size={24} color="#075E54" />
            <Text style={styles.actionMenuText}>Переслать</Text>
          </TouchableOpacity>

          {selectedMessage?.text && (
            <TouchableOpacity style={styles.actionMenuItem} onPress={handleCopy}>
              <Ionicons name="copy" size={24} color="#075E54" />
              <Text style={styles.actionMenuText}>Копировать</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.actionMenuItem, styles.actionMenuItemDelete]} onPress={handleDelete}>
            <Ionicons name="trash" size={24} color="#D32F2F" />
            <Text style={[styles.actionMenuText, styles.actionMenuTextDelete]}>Удалить</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Меню отправки медиа
  const showMediaOptions = () => {
    Alert.alert(
      '📎 Отправить',
      'Выберите тип файла',
      [
        { text: '📷 Фото', onPress: pickImage },
        { text: '🎥 Видео', onPress: pickVideo },
        { text: '🎤 Голосовое', onPress: startRecording },
        { text: '📍 Геолокация', onPress: sendLocation },
        { text: '👤 Контакт', onPress: sendContact },
        { text: '📊 Опрос', onPress: createPoll },
        { text: 'Отмена', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Анимированный фон */}
      <LottieView
        source={require('../assets/chat-bg.json')}
        autoPlay
        loop
        style={StyleSheet.absoluteFill}
        speed={0.3}
        opacity={0.1}
      />

      {/* Блок ответа */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarTitle}>Ответ {replyTo.senderName}</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      )}

      {/* Список сообщений */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
      />

      {/* Камера для видео-кружочков */}
      {showCamera && (
        <Modal visible={showCamera} animationType="slide">
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              mode="video"
              videoQuality="720p"
            >
              <View style={styles.cameraOverlay}>
                <TouchableOpacity
                  style={styles.cameraClose}
                  onPress={() => setShowCamera(false)}
                >
                  <Ionicons name="close" size={30} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.videoNoteFrame}>
                  <View style={styles.videoNoteGuide} />
                  <Text style={styles.videoNoteHint}>
                    Запись видео-кружочка
                  </Text>
                </View>

                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={styles.cameraFlip}
                    onPress={() => setCameraType(cameraType === 'front' ? 'back' : 'front')}
                  >
                    <Ionicons name="camera-reverse" size={30} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.recordButton, isRecordingVideo && styles.recordingActive]}
                    onPress={stopVideoNote}
                  >
                    <View style={styles.recordButtonInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}

      {/* Поле ввода */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={showMediaOptions} style={styles.attachButton}>
            <Ionicons name="add-circle" size={30} color="#075E54" />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Сообщение..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity 
              style={styles.emojiButton}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Ionicons name="happy" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            {/* Кнопка видео-кружочка */}
            <TouchableOpacity
              onLongPress={startVideoNote}
              onPressOut={stopVideoNote}
              style={[styles.actionButton, isRecordingVideo && styles.recordingActive]}
            >
              <Ionicons
                name="videocam"
                size={24}
                color={isRecordingVideo ? "#FFF" : "#075E54"}
              />
            </TouchableOpacity>

            {/* Кнопка отправки / микрофон */}
            <TouchableOpacity
              onPressIn={!inputText ? startRecording : null}
              onPressOut={!inputText ? stopRecording : null}
              onPress={() => inputText && sendMessage({ text: inputText })}
              style={[styles.sendButton, isRecording && styles.recordingButton]}
            >
              <Ionicons
                name={inputText ? "send" : (isRecording ? "stop" : "mic")}
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Меню действий */}
      {renderActionMenu()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5DDD5',
  },
  headerTitle: {
    padding: 5,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSub: {
    fontSize: 12,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
    marginRight: 10,
  },
  headerButton: {
    padding: 5,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typingAnimation: {
    width: 40,
    height: 20,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  messagesList: {
    padding: 15,
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#075E54',
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 10,
  },
  replyContainer: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingLeft: 8,
  },
  replyLine: {
    width: 4,
    backgroundColor: '#075E54',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replySender: {
    fontSize: 11,
    color: '#075E54',
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#000',
  },
  theirMessageText: {
    color: '#000',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginTop: 5,
  },
  videoNote: {
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#075E54',
  },
  videoContainer: {
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  videoNoteBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  videoNoteText: {
    color: '#FFF',
    fontSize: 10,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    gap: 10,
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfo: {
    flex: 1,
  },
  audioWave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#075E54',
    borderRadius: 1.5,
    opacity: 0.5,
  },
  audioDuration: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  transcribingIcon: {
    marginLeft: 10,
  },
  transcribedIcon: {
    marginLeft: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 12,
    color: '#666',
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 12,
    color: '#666',
  },
  pollContainer: {
    minWidth: 250,
    padding: 5,
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  pollOption: {
    marginBottom: 8,
  },
  pollOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  pollOptionText: {
    fontSize: 14,
  },
  pollPercentage: {
    fontSize: 12,
    color: '#666',
  },
  pollBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  pollProgress: {
    height: '100%',
    backgroundColor: '#075E54',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    gap: 4,
  },
  reaction: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
  },
  messageStatus: {
    marginLeft: 2,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarTitle: {
    fontSize: 11,
    color: '#075E54',
    fontWeight: '600',
    marginBottom: 2,
  },
  replyBarText: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    backgroundColor: '#FFF',
    paddingBottom: Platform.OS === 'ios' ? 30 : 25,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  attachButton: {
    padding: 5,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginHorizontal: 10,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    color: '#000',
  },
  emojiButton: {
    padding: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#D32F2F',
  },
  recordingActive: {
    backgroundColor: '#FF4444',
    transform: [{ scale: 1.1 }],
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 20,
  },
  cameraClose: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 8,
  },
  videoNoteFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoNoteGuide: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: '#FFF',
    borderStyle: 'dashed',
  },
  videoNoteHint: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 30,
  },
  cameraFlip: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  actionMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#075E54',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reactionButton: {
    padding: 10,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionMenuItemDelete: {
    borderBottomWidth: 0,
  },
  actionMenuText: {
    fontSize: 16,
    color: '#333',
  },
  actionMenuTextDelete: {
    color: '#D32F2F',
  },
});