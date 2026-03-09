import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, TextInput,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView, Image,
  ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from "react-native-chart-kit";
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// 👇 ИСПРАВЛЕНО: Токен теперь через переменные окружения
const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN || ''; 

const { width } = Dimensions.get('window');

// --- AI АНАЛИЗАТОР И МОДЕРАТОР ---
const askProfessorAI = async (text) => {
  // 👇 ИСПРАВЛЕНО: Проверка наличия токена
  if (!HF_TOKEN) {
    console.warn('HF_TOKEN не настроен');
    return "⚙️ AI не настроен";
  }
  
  const forbidden = ['крипто', 'продам', 'выплаты', 'http'];
  if (forbidden.some(w => text.toLowerCase().includes(w))) return "SPAM";
  
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
      headers: { 
        Authorization: `Bearer ${HF_TOKEN}`, 
        "Content-Type": "application/json" 
      },
      method: "POST",
      body: JSON.stringify({ 
        inputs: `<s>[INST] Ты Профессор Аква. Ответь кратко на русском: ${text} [/INST]`,  
        parameters: { max_new_tokens: 150 }  
      }),
    });
    
    // 👇 ИСПРАВЛЕНО: Добавлена проверка ответа
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const res = await response.json();
    // 👇 ИСПРАВЛЕНО: Безопасная навигация по объекту
    return res[0]?.generated_text?.split('[/INST]')[1]?.trim() || "🐟 Задумался...";
  } catch (e) { 
    console.log('AI Error:', e);
    return "❌ Ошибка связи.";  
  }
};

// ===================== КОМПОНЕНТ СООБЩЕНИЯ =====================
const MessageComponent = memo(({ item, onLongPress }) => {
  const isMe = item.sender === 'me';
  
  // 👇 ИСПРАВЛЕНО: Функция-обработчик с проверкой
  const handleLongPress = useCallback(() => {
    if (onLongPress && typeof onLongPress === 'function') {
      onLongPress(item);
    }
  }, [item, onLongPress]);
  
  return (
    <TouchableOpacity 
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
      style={[styles.msgRow, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}
    >
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
        {item.type === 'image' ?  
          <Image source={{ uri: item.uri }} style={styles.msgImg} /> :  
          // 👇 ИСПРАВЛЕНО: Обрезка длинных слов
          <Text style={[isMe ? styles.myText : styles.otherText, styles.breakText]}>
            {item.text}
          </Text>
        }
        <Text style={styles.msgTime}>
          {item.time} {item.forwarded && "(переслано)"}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ===================== ЭКРАН ЧАТА =====================
const ChatScreen = ({ chat, onBack }) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  // 👇 ИСПРАВЛЕНО: Обработчик долгого нажатия
  const handleMessageLongPress = useCallback((message) => {
    Alert.alert(
      'Действие с сообщением',
      'Выберите действие',
      [
        { text: 'Копировать', onPress: () => console.log('Копировать:', message.text) },
        { text: 'Переслать', onPress: () => console.log('Переслать') },
        { text: 'Удалить', onPress: () => console.log('Удалить'), style: 'destructive' },
        { text: 'Отмена', style: 'cancel' }
      ]
    );
  }, []);

  const onSend = async () => {
    if (!inputText.trim()) return;
    
    const text = inputText; 
    setInputText('');
    
    try {
      // Проверка на спам
      const check = await askProfessorAI(text);
      if (check === "SPAM") {
        Alert.alert("Модератор", "Спам запрещен!");
        return;
      }
      
      // Сообщение пользователя
      const userMessage = { 
        id: Date.now().toString(),  
        text,  
        sender: 'me',  
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })  
      };
      
      setMessages(prev => [...prev, userMessage]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Ответ AI
      setIsLoading(true);
      const reply = await askProfessorAI(text);
      
      const aiMessage = {  
        id: (Date.now() + 1).toString(),  
        text: reply,  
        sender: 'other',  
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })  
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    } finally {
      setIsLoading(false);
    }
  };

  const onPick = async () => {
    try {
      // 👇 ИСПРАВЛЕНО: Запрос разрешений
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Нет доступа', 'Разрешите доступ к галерее');
        return;
      }
      
      let res = await ImagePicker.launchImageLibraryAsync({  
        mediaTypes: ImagePicker.MediaTypeOptions.Images,  
        quality: 0.6,
        allowsEditing: true
      });
      
      if (!res.canceled) {
        setMessages(prev => [...prev, {  
          id: Date.now().toString(),  
          type: 'image',  
          uri: res.assets[0].uri,  
          sender: 'me',  
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })  
        }]);
      }
    } catch (error) {
      console.error('Image pick error:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#001524' }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#00D2FF" />
        </TouchableOpacity>
        <Text style={styles.headerName}>{chat?.name || 'Чат'}</Text>
      </View>
      
      <FlatList  
        ref={flatListRef}
        data={messages}  
        renderItem={({item}) => (
          <MessageComponent 
            item={item} 
            onLongPress={handleMessageLongPress}
          />
        )}
        // 👇 ИСПРАВЛЕНО: Добавлен keyExtractor
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />
      
      {isLoading && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color="#00D2FF" />
          <Text style={styles.loadingText}>AI печатает...</Text>
        </View>
      )}
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 15) }]}>
          <TouchableOpacity onPress={onPick} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="plus" size={30} color="#00D2FF" />
          </TouchableOpacity>
          <TextInput  
            style={styles.input}  
            value={inputText}  
            onChangeText={setInputText}  
            placeholder="Сообщение..."  
            placeholderTextColor="#557"
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            onPress={onSend} 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            disabled={!inputText.trim()}
          >
            <MaterialCommunityIcons name="send" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ===================== ГЛАВНЫЙ КОМПОНЕНТ =====================
export default function App() {
  const [isAuth, setIsAuth] = useState(null);
  const [tab, setTab] = useState('chat');
  const [chat, setChat] = useState(null);

  useEffect(() => {  
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const auth = await AsyncStorage.getItem('auth');
      setIsAuth(auth === 'true');
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuth(false);
    }
  };

  const handleLogin = async () => {
    try {
      await AsyncStorage.setItem('auth', 'true');
      setIsAuth(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (isAuth === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D2FF" />
      </View>
    );
  }
  
  if (!isAuth) return (
    <View style={styles.loginPage}>
      <Text style={{fontSize: 80, marginBottom: 30}}>🦜</Text>
      <TouchableOpacity  
        style={styles.loginBtn}  
        onPress={handleLogin}
        activeOpacity={0.8}
      >
        <Text style={styles.loginBtnText}>ВОЙТИ В AQUA PREMIUM</Text>
      </TouchableOpacity>
    </View>
  );

  if (chat) return <ChatScreen chat={chat} onBack={() => setChat(null)} />;

  // 👇 ИСПРАВЛЕНО: Добавлены key для элементов списка
  const chatItems = [
    { id: '1', name: 'Общий чат', count: 128, icon: '🐠' },
    { id: '2', name: 'Аква-эксперты', count: 45, icon: '🐟' },
    { id: '3', name: 'Продажа рыбок', count: 67, icon: '🦐' },
  ];

  return (
    <SafeAreaProvider style={{backgroundColor: '#001524'}}>
      <SafeAreaView style={{flex: 1}}>
        <StatusBar barStyle="light-content" backgroundColor="#001524" />
        
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Aqua Social</Text>
        </View>
        
        <ScrollView 
          style={{flex: 1}}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'chat' && chatItems.map(item => (
            <TouchableOpacity  
              key={item.id}
              style={styles.chatItem}  
              onPress={() => setChat({id: item.id, name: item.name})}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={{fontSize: 24}}>{item.icon}</Text>
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatCount}>{item.count} участников</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {tab === 'journal' && (
            <View style={{padding: 20}}>
              <Text style={styles.headerName}>График pH за неделю</Text>
              {width > 0 && (
                <LineChart  
                  data={{
                    labels: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],  
                    datasets: [{data: [7.2, 7.1, 7.4, 7.0, 7.2, 7.3, 7.1]}]
                  }}  
                  width={width-40}  
                  height={220}  
                  chartConfig={{
                    backgroundGradientFrom: "#001C2F",  
                    backgroundGradientTo: "#002B44",  
                    color: (opacity = 1) => `rgba(0, 210, 255, ${opacity})`,  
                    labelColor: () => "#FFF",
                    style: { borderRadius: 15 }
                  }}  
                  bezier  
                  style={{borderRadius: 15, marginTop: 20}}  
                />
              )}
            </View>
          )}
        </ScrollView>
        
        <View style={styles.tabBar}>
          <TouchableOpacity 
            onPress={() => setTab('chat')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons 
              name="message" 
              size={28} 
              color={tab === 'chat' ? "#00D2FF" : "#557"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTab('journal')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons 
              name="chart-line" 
              size={28} 
              color={tab === 'journal' ? "#00D2FF" : "#557"} 
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ===================== ОБНОВЛЕННЫЕ СТИЛИ =====================
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#001524',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPage: {  
    flex: 1,  
    backgroundColor: '#001524',  
    justifyContent: 'center',  
    alignItems: 'center',
    padding: 20,
  },
  loginBtn: {  
    backgroundColor: '#00D2FF',  
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loginBtnText: {  
    color: '#001524',  
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {  
    backgroundColor: '#001C2F',  
    flexDirection: 'row',  
    alignItems: 'center',  
    paddingBottom: 15,  
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#002B44',
  },
  headerName: {  
    color: '#FFF',  
    fontSize: 18,  
    fontWeight: 'bold',  
    marginLeft: 10,
    flex: 1,
  },
  inputBar: {  
    flexDirection: 'row',  
    padding: 10,  
    backgroundColor: '#001C2F',  
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#002B44',
  },
  input: {  
    flex: 1,  
    backgroundColor: '#001524',  
    borderRadius: 20,  
    paddingHorizontal: 15,  
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#FFF',  
    marginHorizontal: 10,  
    maxHeight: 100,
    fontSize: 16,
  },
  sendBtn: {  
    width: 45,  
    height: 45,  
    borderRadius: 23,  
    backgroundColor: '#00D2FF',  
    justifyContent: 'center',  
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#557',
    opacity: 0.5,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginLeft: 20,
  },
  loadingText: {
    color: '#00D2FF',
    marginLeft: 10,
    fontSize: 12,
  },
  msgRow: {  
    padding: 5,
    marginVertical: 2,
  },
  bubble: {  
    padding: 12,  
    borderRadius: 18,  
    maxWidth: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  myBubble: {  
    backgroundColor: '#00D2FF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {  
    backgroundColor: '#002B44',
    borderBottomLeftRadius: 4,
  },
  myText: {  
    color: '#001524',
    fontSize: 16,
  },
  otherText: {  
    color: '#FFF',
    fontSize: 16,
  },
  // 👇 НОВЫЙ СТИЛЬ: Перенос длинных слов
  breakText: {
    flexShrink: 1,
    flexWrap: 'wrap',
    wordBreak: 'break-word',
  },
  msgTime: {  
    fontSize: 10,  
    color: 'rgba(255,255,255,0.5)',  
    marginTop: 4,  
    alignSelf: 'flex-end',
  },
  msgImg: {  
    width: 200,  
    height: 200,  
    borderRadius: 15,
    resizeMode: 'cover',
  },
  topBar: {  
    padding: 20,  
    backgroundColor: '#001C2F',
    borderBottomWidth: 1,
    borderBottomColor: '#002B44',
  },
  topTitle: {  
    color: '#00D2FF',  
    fontSize: 24,  
    fontWeight: 'bold',
  },
  chatItem: {  
    flexDirection: 'row',  
    padding: 20,  
    alignItems: 'center',  
    backgroundColor: '#001C2F',  
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
  },
  avatar: {  
    width: 50,  
    height: 50,  
    borderRadius: 25,  
    backgroundColor: '#002B44',  
    justifyContent: 'center',  
    alignItems: 'center',
  },
  chatName: {  
    color: '#FFF',  
    fontSize: 17,
    fontWeight: '600',
  },
  chatCount: {
    color: '#557',
    fontSize: 13,
    marginTop: 2,
  },
  tabBar: {  
    height: 60,  
    backgroundColor: '#001C2F',  
    flexDirection: 'row',  
    justifyContent: 'space-around',  
    alignItems: 'center',  
    borderTopWidth: 1,  
    borderTopColor: '#002B44',
  },
});
