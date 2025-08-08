import React, {useState, useEffect} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  FAB,
  Avatar,
  Divider,
  IconButton,
  Searchbar,
} from 'react-native-paper';
import {theme} from '../utils/theme';
import {chatService} from '../services/chatService';

const ChatListScreen = ({navigation}) => {
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState([]);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    filterChats();
  }, [searchQuery, chats]);

  const loadChats = async () => {
    try {
      const loadedChats = await chatService.getAllChats();
      setChats(loadedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const filterChats = () => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  };

  const createNewChat = () => {
    Alert.alert(
      'New Chat',
      'Choose chat type',
      [
        {
          text: 'Regular Chat',
          onPress: () => startNewChat(false),
        },
        {
          text: 'AI Chat',
          onPress: () => startNewChat(true),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const startNewChat = async (isAI = false) => {
    try {
      const newChat = await chatService.createChat({
        name: isAI ? 'AI Assistant' : 'New Chat',
        isAI: isAI,
        participants: isAI ? ['user', 'ai'] : ['user'],
      });

      navigation.navigate('Chat', {
        chatId: newChat.id,
        chatName: newChat.name,
        isAI: newChat.isAI,
      });
    } catch (error) {
      console.error('Error creating new chat:', error);
      Alert.alert('Error', 'Failed to create new chat');
    }
  };

  const deleteChat = async (chatId) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteChat(chatId);
              loadChats();
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], {weekday: 'short'});
    } else {
      return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
    }
  };

  const renderChatItem = ({item}) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        navigation.navigate('Chat', {
          chatId: item.id,
          chatName: item.name,
          isAI: item.isAI,
        })
      }>
      <Avatar.Icon
        size={50}
        icon={item.isAI ? 'robot' : 'account'}
        style={[
          styles.avatar,
          {backgroundColor: item.isAI ? theme.colors.secondary : theme.colors.primary}
        ]}
      />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.name}
            {item.isAI && (
              <Text style={styles.aiIndicator}> (AI)</Text>
            )}
          </Text>
          <Text style={styles.timestamp}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.chatPreview}>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.lastMessage || 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
      <IconButton
        icon="delete"
        size={20}
        onPress={() => deleteChat(item.id)}
        style={styles.deleteButton}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search chats..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <IconButton
          icon="cog"
          size={24}
          onPress={() => navigation.navigate('Settings')}
        />
      </View>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={createNewChat}
        label="New Chat"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.small,
  },
  searchBar: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  listContainer: {
    paddingBottom: 80,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    marginRight: theme.spacing.md,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  aiIndicator: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: 'normal',
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.placeholder,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: theme.colors.notification,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  unreadText: {
    color: theme.colors.onError,
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginLeft: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});

export default ChatListScreen;
