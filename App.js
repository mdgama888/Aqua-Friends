import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, TextInput,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView, Image, Modal,
  ActivityIndicator, LayoutAnimation, Share, Dimensions
} from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from "react-native-chart-kit";
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const HF_TOKEN = "hf_ВАШ_ТОКЕН_ЗДЕСЬ"; // ВСТАВЬ СВОЙ ТОКЕН!

// --- AI АНАЛИЗАТОР И МОДЕРАТОР ---
const askProfessorAI = async (text) => {
  const forbidden = ['крипто', 'продам', 'выплаты', 'http'];
  if (forbidden.some(w => text.toLowerCase().includes(w))) return "SPAM";
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
      headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ 
        inputs: `<s>[INST] Ты Профессор Аква. Ответь кратко на русском: ${text} [/INST]`, 
        parameters: { max_new_tokens: 150 } 
      }),
    });
    const res = await response.json();
    return res[0]?.generated_text?.split('[/INST]')[1]?.trim() || "🐟 Задумался...";
  } catch (e) { 
    console.log(e);
    return "❌ Ошибка связи."; 
  }
};

// ===================== КОМПОНЕНТ СООБЩЕНИЯ =====================
const MessageComponent = memo(({ item, onLongPress }) => {
  const isMe = item.sender === 'me';
  return (
    <TouchableOpacity 
      onLongPress={() => onLongPress(item)} 
      style={[styles.msgRow, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}
    >
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
        {item.type === 'image' ? 
          <Image source={{ uri: item.uri }} style={styles.msgImg} /> : 
          <Text style={isMe ? styles.myText : styles.otherText}>{item.text}</Text>
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
  const flatListRef = useRef(null);

  const onSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText; 
    setInputText('');
    
    // Проверка на спам
    const check = await askProfessorAI(text);
    if (check === "SPAM") return Alert.alert("Модератор", "Спам запрещен!");
    
    // Сообщение пользователя
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      text, 
      sender: 'me', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Ответ AI
    setTimeout(async () => {
      const reply = await askProfessorAI(text);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        text: reply, 
        sender: 'other', 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    }, 1000);
  };

  const onPick = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.6 
    });
    if (!res.canceled) 
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        type: 'image', 
        uri: res.assets[0].uri, 
        sender: 'me', 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#001524' }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#00D2FF" />
        </TouchableOpacity>
        <Text style={styles.headerName}>{chat.name}</Text>
      </View>
      
      <FlatList 
        ref={flatListRef}
        data={messages} 
        renderItem={({item}) => <MessageComponent item={item} onLongPress={() => {}} />} 
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 10 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 15) }]}>
          <TouchableOpacity onPress={onPick}>
            <MaterialCommunityIcons name="plus" size={30} color="#00D2FF" />
          </TouchableOpacity>
          <TextInput 
            style={styles.input} 
            value={inputText} 
            onChangeText={setInputText} 
            placeholder="Сообщение..." 
            placeholderTextColor="#557" 
          />
          <TouchableOpacity onPress={onSend} style={styles.sendBtn}>
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
  const [tab, setTab] = useState('chat'); // chat, journal, feed
  const [chat, setChat] = useState(null);

  useEffect(() => { 
    AsyncStorage.getItem('auth').then(v => setIsAuth(v === 'true')); 
  }, []);

  if (isAuth === null) return null;
  
  if (!isAuth) return (
    <View style={styles.loginPage}>
      <Text style={{fontSize: 80}}>🦜</Text>
      <TouchableOpacity 
        style={styles.loginBtn} 
        onPress={() => { 
          AsyncStorage.setItem('auth', 'true'); 
          setIsAuth(true); 
        }}
      >
        <Text style={styles.loginBtnText}>ВОЙТИ В AQUA PREMIUM</Text>
      </TouchableOpacity>
    </View>
  );

  if (chat) return <ChatScreen chat={chat} onBack={() => setChat(null)} />;

  return (
    <SafeAreaProvider style={{backgroundColor: '#001524'}}>
      <SafeAreaView style={{flex: 1}}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Aqua Social</Text>
        </View>
        
        <ScrollView style={{flex: 1}}>
          {tab === 'chat' && (
            <TouchableOpacity 
              style={styles.chatItem} 
              onPress={() => setChat({id: '1', name: 'Аква-Клуб'})}
            >
              <View style={styles.avatar}><Text>🐠</Text></View>
              <Text style={styles.chatName}>Общий чат (128)</Text>
            </TouchableOpacity>
          )}
          
          {tab === 'journal' && (
            <View style={{padding: 20}}>
              <Text style={styles.headerName}>График pH за неделю</Text>
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
                  labelColor: () => "#FFF"
                }} 
                bezier 
                style={{borderRadius: 15, marginTop: 20}} 
              />
            </View>
          )}
        </ScrollView>
        
        <View style={styles.tabBar}>
          <TouchableOpacity onPress={() => setTab('chat')}>
            <MaterialCommunityIcons name="message" size={28} color={tab === 'chat' ? "#00D2FF" : "#557"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('journal')}>
            <MaterialCommunityIcons name="chart-line" size={28} color={tab === 'journal' ? "#00D2FF" : "#557"} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ===================== СТИЛИ =====================
const styles = StyleSheet.create({
  loginPage: { 
    flex: 1, 
    backgroundColor: '#001524', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loginBtn: { 
    backgroundColor: '#00D2FF', 
    padding: 15, 
    borderRadius: 30 
  },
  loginBtnText: { 
    color: '#001524', 
    fontWeight: 'bold' 
  },
  header: { 
    backgroundColor: '#001C2F', 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingBottom: 15, 
    paddingHorizontal: 15 
  },
  headerName: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginLeft: 10 
  },
  inputBar: { 
    flexDirection: 'row', 
    padding: 10, 
    backgroundColor: '#001C2F', 
    alignItems: 'center' 
  },
  input: { 
    flex: 1, 
    backgroundColor: '#001524', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    color: '#FFF', 
    marginHorizontal: 10, 
    height: 40 
  },
  sendBtn: { 
    width: 45, 
    height: 45, 
    borderRadius: 23, 
    backgroundColor: '#00D2FF', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  msgRow: { 
    padding: 5 
  },
  bubble: { 
    padding: 12, 
    borderRadius: 18, 
    maxWidth: '80%' 
  },
  myBubble: { 
    backgroundColor: '#00D2FF' 
  },
  otherBubble: { 
    backgroundColor: '#002B44' 
  },
  myText: { 
    color: '#001524' 
  },
  otherText: { 
    color: '#FFF' 
  },
  msgTime: { 
    fontSize: 10, 
    color: '#557', 
    marginTop: 4, 
    alignSelf: 'flex-end' 
  },
  msgImg: { 
    width: 200, 
    height: 200, 
    borderRadius: 15 
  },
  topBar: { 
    padding: 20, 
    backgroundColor: '#001C2F' 
  },
  topTitle: { 
    color: '#00D2FF', 
    fontSize: 22, 
    fontWeight: 'bold' 
  },
  chatItem: { 
    flexDirection: 'row', 
    padding: 20, 
    alignItems: 'center', 
    backgroundColor: '#001C2F', 
    margin: 10, 
    borderRadius: 15 
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#002B44', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  chatName: { 
    color: '#FFF', 
    fontSize: 17 
  },
  tabBar: { 
    height: 60, 
    backgroundColor: '#001C2F', 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#002B44' 
  }
});