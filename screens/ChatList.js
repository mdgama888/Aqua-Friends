import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const TopTab = createMaterialTopTabNavigator();

// Моковые данные для чатов
const MOCK_CHATS = [
  {
    id: '1',
    name: '🤖 AI Assistant',
    lastMessage: 'Я проанализировал данные за неделю',
    time: '14:20',
    avatar: 'https://i.pravatar.cc/150?img=1',
    online: true,
    isGroup: false,
    unread: 2,
    pinned: true,
    mute: false
  },
  {
    id: '2',
    name: '👩 Мама',
    lastMessage: 'Ты поел? Приготовила твои любимые котлеты',
    time: '13:05',
    avatar: 'https://i.pravatar.cc/150?img=2',
    online: false,
    isGroup: false,
    unread: 0,
    pinned: false,
    mute: false
  },
  {
    id: '3',
    name: '🐠 Аквариумисты',
    lastMessage: 'Иван: Кто пойдет на встречу в субботу?',
    time: '12:00',
    avatar: 'https://i.pravatar.cc/150?img=3',
    isGroup: true,
    participants: 128,
    unread: 5,
    pinned: true,
    mute: false,
    admins: ['me']
  },
  {
    id: '4',
    name: '🦐 Зоомагазин "Рыбка"',
    lastMessage: 'Акция: 2+1 на корма! Только сегодня',
    time: 'вчера',
    avatar: 'https://i.pravatar.cc/150?img=4',
    online: true,
    isGroup: false,
    unread: 0,
    pinned: false,
    mute: true
  },
  {
    id: '5',
    name: '🌿 Акваскейпинг',
    lastMessage: 'Новое видео о создании травника',
    time: 'вчера',
    avatar: 'https://i.pravatar.cc/150?img=5',
    isGroup: true,
    participants: 45,
    unread: 3,
    pinned: false,
    mute: false,
    admins: ['user1', 'user2']
  },
  {
    id: '6',
    name: '📷 Фото конкурс',
    lastMessage: 'Прием работ до пятницы',
    time: 'пн',
    avatar: 'https://i.pravatar.cc/150?img=6',
    isGroup: true,
    participants: 67,
    unread: 0,
    pinned: false,
    mute: false
  },
];

// Компонент для отображения одного чата
const ChatItem = ({ item, navigation, onDelete, onMute, onPin }) => {
  const [showActions, setShowActions] = useState(false);

  // Правые действия при свайпе (удаление)
  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity 
        style={[styles.swipeButton, styles.swipeDelete]}
        onPress={() => onDelete(item)}
      >
        <Ionicons name="trash" size={24} color="#FFF" />
        <Text style={styles.swipeText}>Удалить</Text>
      </TouchableOpacity>
    </View>
  );

  // Левые действия при свайпе (закрепить/архив)
  const renderLeftActions = () => (
    <View style={[styles.swipeActions, styles.swipeLeft]}>
      <TouchableOpacity 
        style={[styles.swipeButton, styles.swipePin]}
        onPress={() => onPin(item)}
      >
        <Ionicons 
          name={item.pinned ? "pin-off" : "pin"} 
          size={24} 
          color="#FFF" 
        />
        <Text style={styles.swipeText}>
          {item.pinned ? 'Открепить' : 'Закрепить'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.swipeButton, styles.swipeMute]}
        onPress={() => onMute(item)}
      >
        <Ionicons 
          name={item.mute ? "notifications-off" : "notifications"} 
          size={24} 
          color="#FFF" 
        />
        <Text style={styles.swipeText}>
          {item.mute ? 'Вкл звук' : 'Выкл звук'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      overshootRight={false}
      overshootLeft={false}
    >
      <TouchableOpacity
        style={[styles.chatItem, item.pinned && styles.pinnedChat]}
        onPress={() => navigation.navigate('Chat', { chat: item })}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setShowActions(true);
        }}
        activeOpacity={0.7}
      >
        {/* Аватар с индикатором онлайн */}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          {!item.isGroup && (
            <View style={[styles.statusDot, item.online ? styles.online : styles.offline]} />
          )}
          {item.isGroup && (
            <View style={styles.groupBadge}>
              <Ionicons name="people" size={12} color="#FFF" />
            </View>
          )}
        </View>

        {/* Информация о чате */}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.chatName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isGroup && (
                <View style={styles.groupIndicator}>
                  <Ionicons name="people" size={14} color="#075E54" />
                  <Text style={styles.groupCount}>{item.participants}</Text>
                </View>
              )}
              {item.mute && (
                <Ionicons name="notifications-off" size={16} color="#999" style={styles.muteIcon} />
              )}
            </View>
            <Text style={styles.chatTime}>{item.time}</Text>
          </View>

          <View style={styles.chatFooter}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Меню действий (при долгом нажатии) */}
        {showActions && (
          <View style={styles.actionMenu}>
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => {
                setShowActions(false);
                onPin(item);
              }}
            >
              <Ionicons 
                name={item.pinned ? "pin-off" : "pin"} 
                size={20} 
                color="#075E54" 
              />
              <Text>{item.pinned ? 'Открепить' : 'Закрепить'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => {
                setShowActions(false);
                onMute(item);
              }}
            >
              <Ionicons 
                name={item.mute ? "notifications" : "notifications-off"} 
                size={20} 
                color="#075E54" 
              />
              <Text>{item.mute ? 'Включить звук' : 'Выключить звук'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionItem, styles.actionDelete]}
              onPress={() => {
                setShowActions(false);
                onDelete(item);
              }}
            >
              <Ionicons name="trash" size={20} color="#D32F2F" />
              <Text style={styles.deleteText}>Удалить чат</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionClose}
              onPress={() => setShowActions(false)}
            >
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};

// Компонент списка чатов
const ChatListComponent = ({ data, navigation, setChats }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Обновление списка
  const onRefresh = () => {
    setRefreshing(true);
    // Имитация загрузки
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Фильтрация по поиску
  const filteredData = data.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Удаление чата
  const handleDelete = (chat) => {
    Alert.alert(
      '🗑️ Удалить чат',
      `Удалить чат с ${chat.name}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          onPress: () => {
            setChats(prev => prev.filter(c => c.id !== chat.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Закрепление/открепление чата
  const handlePin = (chat) => {
    setChats(prev => prev.map(c =>
      c.id === chat.id ? { ...c, pinned: !c.pinned } : c
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Включение/выключение звука
  const handleMute = (chat) => {
    setChats(prev => prev.map(c =>
      c.id === chat.id ? { ...c, mute: !c.mute } : c
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      chat.mute ? '🔊 Звук включен' : '🔇 Звук выключен',
      `Уведомления от ${chat.name} ${chat.mute ? 'будут приходить' : 'отключены'}`
    );
  };

  // Сортировка: закрепленные сверху
  const sortedData = [...filteredData].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <View style={styles.tabContainer}>
      {/* Поиск */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по чатам"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Список чатов */}
      <FlatList
        data={sortedData}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ChatItem
            item={item}
            navigation={navigation}
            onDelete={handleDelete}
            onMute={handleMute}
            onPin={handlePin}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#075E54']}
            tintColor="#075E54"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>Нет чатов</Text>
            <Text style={styles.emptySubText}>
              Нажмите + чтобы начать новый чат
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Основной компонент с табами
export default function ChatList({ navigation, route }) {
  const [chats, setChats] = useState(MOCK_CHATS);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Обработка приглашения по QR-коду
  useEffect(() => {
    if (route.params?.joinGroup) {
      const groupId = route.params.joinGroup.split('/').pop();
      Alert.alert(
        '🎉 Приглашение в группу',
        'Хотите присоединиться к группе "Аквариумисты"?',
        [
          { text: 'Отмена' },
          {
            text: 'Присоединиться',
            onPress: () => {
              const newGroup = {
                id: Date.now().toString(),
                name: 'Новая группа',
                lastMessage: 'Добро пожаловать!',
                time: 'только что',
                avatar: 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 10),
                isGroup: true,
                participants: 1,
                unread: 1,
                pinned: false,
                mute: false
              };
              setChats(prev => [newGroup, ...prev]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        ]
      );
    }
  }, [route.params?.joinGroup]);

  // Создание нового чата/группы
  const handleCreate = (type) => {
    setShowCreateMenu(false);
    
    if (type === 'group') {
      Alert.alert(
        '👥 Создать группу',
        'Введите название группы',
        [
          { text: 'Отмена' },
          {
            text: 'Создать',
            onPress: (name) => {
              const newGroup = {
                id: Date.now().toString(),
                name: name || 'Новая группа',
                lastMessage: 'Группа создана',
                time: 'только что',
                avatar: 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 10),
                isGroup: true,
                participants: 1,
                unread: 0,
                pinned: false,
                mute: false,
                admins: ['me']
              };
              setChats(prev => [newGroup, ...prev]);
              navigation.navigate('Chat', { chat: newGroup });
            }
          }
        ],
        'plain-text'
      );
    } else if (type === 'contact') {
      Alert.alert(
        '👤 Новый контакт',
        'Введите номер телефона',
        [
          { text: 'Отмена' },
          {
            text: 'Добавить',
            onPress: (phone) => {
              Alert.alert('✅ Контакт добавлен', `Номер: ${phone}`);
            }
          }
        ],
        'plain-text'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aqua Chat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowCreateMenu(true)}
          >
            <Ionicons name="create-outline" size={24} color="#075E54" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Настройки')}
          >
            <Ionicons name="settings-outline" size={24} color="#075E54" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Табы */}
      <TopTab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
          tabBarIndicatorStyle: { backgroundColor: '#075E54', height: 3 },
          tabBarActiveTintColor: '#075E54',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: { backgroundColor: '#FFF', elevation: 0, shadowOpacity: 0 },
        }}
      >
        <TopTab.Screen name="Все">
          {() => (
            <ChatListComponent
              data={chats}
              navigation={navigation}
              setChats={setChats}
            />
          )}
        </TopTab.Screen>
        
        <TopTab.Screen name="Личные">
          {() => (
            <ChatListComponent
              data={chats.filter(c => !c.isGroup)}
              navigation={navigation}
              setChats={setChats}
            />
          )}
        </TopTab.Screen>
        
        <TopTab.Screen name="Группы">
          {() => (
            <ChatListComponent
              data={chats.filter(c => c.isGroup)}
              navigation={navigation}
              setChats={setChats}
            />
          )}
        </TopTab.Screen>
      </TopTab.Navigator>

      {/* Меню создания */}
      {showCreateMenu && (
        <TouchableOpacity
          style={styles.createMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateMenu(false)}
        >
          <View style={styles.createMenu}>
            <TouchableOpacity
              style={styles.createMenuItem}
              onPress={() => handleCreate('contact')}
            >
              <View style={[styles.createIcon, { backgroundColor: '#075E54' }]}>
                <Ionicons name="person" size={24} color="#FFF" />
              </View>
              <Text style={styles.createMenuText}>Новый контакт</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createMenuItem}
              onPress={() => handleCreate('group')}
            >
              <View style={[styles.createIcon, { backgroundColor: '#128C7E' }]}>
                <Ionicons name="people" size={24} color="#FFF" />
              </View>
              <Text style={styles.createMenuText}>Новая группа</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createMenuItem}
              onPress={() => {
                setShowCreateMenu(false);
                navigation.navigate('Камера');
              }}
            >
              <View style={[styles.createIcon, { backgroundColor: '#25D366' }]}>
                <Ionicons name="qr-code" size={24} color="#FFF" />
              </View>
              <Text style={styles.createMenuText}>QR-код</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#075E54',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    padding: 5,
  },
  tabContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pinnedChat: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    marginVertical: 2,
    paddingHorizontal: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    right: 2,
    bottom: 2,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#9E9E9E',
  },
  groupBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#075E54',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    maxWidth: '60%',
  },
  groupIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  groupCount: {
    fontSize: 11,
    color: '#075E54',
    fontWeight: '600',
  },
  muteIcon: {
    marginLeft: 4,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#075E54',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  swipeLeft: {
    marginLeft: 10,
  },
  swipeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  swipeDelete: {
    backgroundColor: '#D32F2F',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  swipePin: {
    backgroundColor: '#075E54',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  swipeMute: {
    backgroundColor: '#FFA000',
  },
  swipeText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  },
  actionMenu: {
    position: 'absolute',
    right: 10,
    top: 40,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minWidth: 150,
  },
  actionDelete: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: '#D32F2F',
  },
  actionClose: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCC',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  createMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  createMenu: {
    backgroundColor: '#FFF',
    marginTop: 100,
    marginRight: 20,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
  },
  createMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  createIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createMenuText: {
    fontSize: 16,
    color: '#333',
  },
});