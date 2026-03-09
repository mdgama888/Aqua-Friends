import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  Modal,
  Share,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';

// Моковые данные участников
const MOCK_MEMBERS = [
  { id: '1', name: 'Вы', avatar: 'https://i.pravatar.cc/150?img=1', role: 'admin', status: 'онлайн', phone: '+7 (999) 123-45-67' },
  { id: '2', name: 'Иван Петров', avatar: 'https://i.pravatar.cc/150?img=2', role: 'admin', status: 'онлайн', phone: '+7 (999) 234-56-78' },
  { id: '3', name: 'Мария Смирнова', avatar: 'https://i.pravatar.cc/150?img=3', role: 'member', status: 'был(а) 5 мин назад', phone: '+7 (999) 345-67-89' },
  { id: '4', name: 'Алексей Водкин', avatar: 'https://i.pravatar.cc/150?img=4', role: 'member', status: 'онлайн', phone: '+7 (999) 456-78-90' },
  { id: '5', name: 'Елена Аквариумова', avatar: 'https://i.pravatar.cc/150?img=5', role: 'member', status: 'был(а) 2 часа назад', phone: '+7 (999) 567-89-01' },
  { id: '6', name: 'Дмитрий Рыбкин', avatar: 'https://i.pravatar.cc/150?img=6', role: 'member', status: 'онлайн', phone: '+7 (999) 678-90-12' },
];

export default function GroupInfoScreen({ route, navigation }) {
  const { group } = route.params;
  const [isAdmin, setIsAdmin] = useState(true); // В демо всегда админ
  const [groupName, setGroupName] = useState(group.name || 'Аквариумисты');
  const [groupDescription, setGroupDescription] = useState(group.description || 'Обсуждаем аквариумы, рыбок и растения 🐠');
  const [groupAvatar, setGroupAvatar] = useState(group.avatar || 'https://i.pravatar.cc/150?img=7');
  const [notifications, setNotifications] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Ссылка для приглашения
  const inviteLink = `https://aquafriend.app/join/group/${group.id || '123456'}`;

  // Копировать ссылку
  const copyInviteLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ Скопировано', 'Ссылка скопирована в буфер обмена');
  };

  // Поделиться ссылкой
  const shareInviteLink = async () => {
    try {
      await Share.share({
        message: `🐠 Присоединяйся к группе "${groupName}" в Aqua Friend!\n\n${inviteLink}\n\nСкачай приложение: https://aquafriend.app`,
        title: 'Приглашение в группу',
      });
    } catch (error) {
      console.log(error);
    }
  };

  // Изменить фото группы
  const changeGroupPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Нужен доступ к галерее');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setGroupAvatar(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Фото обновлено');
    }
  };

  // Назначить админа
  const toggleAdmin = (member) => {
    Alert.alert(
      '👑 Назначить админом',
      `Сделать ${member.name} администратором?`,
      [
        { text: 'Отмена' },
        {
          text: 'Назначить',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ Готово', `${member.name} теперь администратор`);
          }
        }
      ]
    );
  };

  // Удалить участника
  const removeMember = (member) => {
    if (member.name === 'Вы') {
      Alert.alert('❌ Ошибка', 'Вы не можете удалить себя');
      return;
    }

    Alert.alert(
      '🚫 Удалить участника',
      `Удалить ${member.name} из группы?`,
      [
        { text: 'Отмена' },
        {
          text: 'Удалить',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ Готово', `${member.name} удален из группы`);
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Покинуть группу
  const leaveGroup = () => {
    Alert.alert(
      '👋 Покинуть группу',
      isAdmin ? 'Вы админ. При удалении группа исчезнет у всех' : 'Точно покинуть группу?',
      [
        { text: 'Отмена' },
        {
          text: isAdmin ? 'Удалить группу' : 'Покинуть',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
            setTimeout(() => {
              Alert.alert('✅ Готово', isAdmin ? 'Группа удалена' : 'Вы покинули группу');
            }, 500);
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Очистить историю
  const clearHistory = () => {
    Alert.alert(
      '🗑️ Очистить историю',
      'Удалить все сообщения в группе?',
      [
        { text: 'Отмена' },
        {
          text: 'Очистить',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ История очищена');
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Фильтрация участников по поиску
  const filteredMembers = MOCK_MEMBERS.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phone.includes(searchQuery)
  );

  // Рендер участника
  const renderMember = ({ item }) => (
    <View style={styles.memberItem}>
      <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{item.name}</Text>
          {item.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield" size={12} color="#075E54" />
              <Text style={styles.adminText}>Админ</Text>
            </View>
          )}
        </View>
        <Text style={styles.memberStatus}>{item.status}</Text>
        <Text style={styles.memberPhone}>{item.phone}</Text>
      </View>
      {isAdmin && item.name !== 'Вы' && (
        <View style={styles.memberActions}>
          {item.role !== 'admin' && (
            <TouchableOpacity
              style={styles.memberAction}
              onPress={() => toggleAdmin(item)}
            >
              <Ionicons name="shield-outline" size={22} color="#075E54" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.memberAction}
            onPress={() => removeMember(item)}
          >
            <Ionicons name="trash-outline" size={22} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Шапка с фото группы */}
      <View style={styles.header}>
        <TouchableOpacity onPress={changeGroupPhoto} disabled={!isAdmin}>
          <Image source={{ uri: groupAvatar }} style={styles.groupAvatar} />
          {isAdmin && (
            <View style={styles.editAvatarOverlay}>
              <Ionicons name="camera" size={24} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.groupName}>{groupName}</Text>
        <Text style={styles.groupMeta}>
          👥 {MOCK_MEMBERS.length} участников • создана в марте 2024
        </Text>
      </View>

      {/* Описание группы */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Описание</Text>
        <Text style={styles.groupDescription}>{groupDescription}</Text>
      </View>

      {/* Участники (кратко) */}
      <TouchableOpacity
        style={styles.section}
        onPress={() => setShowMembersModal(true)}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Участники ({MOCK_MEMBERS.length})</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
        <View style={styles.avatarsRow}>
          {MOCK_MEMBERS.slice(0, 5).map((member, index) => (
            <Image
              key={member.id}
              source={{ uri: member.avatar }}
              style={[
                styles.miniAvatar,
                { marginLeft: index > 0 ? -10 : 0 }
              ]}
            />
          ))}
          {MOCK_MEMBERS.length > 5 && (
            <View style={styles.moreAvatars}>
              <Text style={styles.moreAvatarsText}>+{MOCK_MEMBERS.length - 5}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Настройки группы (для админа) */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Управление</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="create-outline" size={22} color="#075E54" />
            <Text style={styles.menuText}>Изменить название</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="document-text-outline" size={22} color="#075E54" />
            <Text style={styles.menuText}>Изменить описание</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={changeGroupPhoto}
          >
            <Ionicons name="camera-outline" size={22} color="#075E54" />
            <Text style={styles.menuText}>Изменить фото</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Приглашения */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Пригласить</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={copyInviteLink}
        >
          <Ionicons name="link-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Копировать ссылку</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={shareInviteLink}
        >
          <Ionicons name="share-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Поделиться ссылкой</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowQRModal(true)}
        >
          <Ionicons name="qr-code-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Показать QR-код</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowInviteModal(true)}
        >
          <Ionicons name="people-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Пригласить из контактов</Text>
        </TouchableOpacity>
      </View>

      {/* Настройки уведомлений */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Уведомления</Text>
        
        <View style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={22} color="#075E54" />
          <Text style={styles.menuText}>Уведомления</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#767577', true: '#075E54' }}
            style={styles.switch}
          />
        </View>
      </View>

      {/* Действия */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.menuItem, styles.dangerItem]}
          onPress={clearHistory}
        >
          <Ionicons name="trash-outline" size={22} color="#D32F2F" />
          <Text style={[styles.menuText, styles.dangerText]}>Очистить историю</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.dangerItem]}
          onPress={leaveGroup}
        >
          <Ionicons name="exit-outline" size={22} color="#D32F2F" />
          <Text style={[styles.menuText, styles.dangerText]}>
            {isAdmin ? 'Удалить группу' : 'Покинуть группу'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Модалка с QR-кодом */}
      <Modal visible={showQRModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR-код группы</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={inviteLink}
                size={200}
                color="#075E54"
                backgroundColor="#FFF"
              />
            </View>

            <Text style={styles.qrHint}>
              Отсканируйте код для вступления в группу
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={copyInviteLink}
            >
              <Ionicons name="copy-outline" size={20} color="#FFF" />
              <Text style={styles.modalButtonText}>Копировать ссылку</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Модалка со всеми участниками */}
      <Modal visible={showMembersModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMembersModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Участники ({MOCK_MEMBERS.length})</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по имени или телефону"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredMembers}
            renderItem={renderMember}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.membersList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* Модалка редактирования */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Редактировать группу</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.editForm}>
              <Text style={styles.editLabel}>Название группы</Text>
              <TextInput
                style={styles.editInput}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Введите название"
                maxLength={50}
              />

              <Text style={styles.editLabel}>Описание</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={groupDescription}
                onChangeText={setGroupDescription}
                placeholder="Введите описание"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, styles.editButtonCancel]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.editButtonTextCancel}>Отмена</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, styles.editButtonSave]}
                onPress={() => {
                  setShowEditModal(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('✅ Готово', 'Данные обновлены');
                }}
              >
                <Text style={styles.editButtonTextSave}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка приглашения из контактов */}
      <Modal visible={showInviteModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Пригласить</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск контактов"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={MOCK_MEMBERS.filter(m => m.name !== 'Вы')}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => {
                  Alert.alert(
                    '📨 Приглашение отправлено',
                    `${item.name} получит приглашение в группу`
                  );
                  setShowInviteModal(false);
                }}
              >
                <Image source={{ uri: item.avatar }} style={styles.contactAvatar} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
                <Ionicons name="send-outline" size={22} color="#075E54" />
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.membersList}
          />
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
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  groupAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  editAvatarOverlay: {
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
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  groupMeta: {
    fontSize: 14,
    color: '#666',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 10,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  moreAvatars: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  moreAvatarsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
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
  dangerItem: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 5,
  },
  dangerText: {
    color: '#D32F2F',
  },
  switch: {
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#075E54',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginBottom: 15,
  },
  qrHint: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#075E54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: 60,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
  membersList: {
    padding: 15,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  adminText: {
    fontSize: 10,
    color: '#075E54',
    fontWeight: '600',
  },
  memberStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 11,
    color: '#999',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 15,
  },
  memberAction: {
    padding: 5,
  },
  editForm: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  editButtonSave: {
    backgroundColor: '#075E54',
  },
  editButtonTextCancel: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  editButtonTextSave: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 12,
    color: '#999',
  },
});