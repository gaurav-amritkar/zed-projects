import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  IconButton,
  TextInput,
  ActivityIndicator,
  Text,
} from 'react-native-paper';
import {GiftedChat, Bubble, InputToolbar, Send} from 'react-native-gifted-chat';
import {theme} from '../utils/theme';
import {chatService} from '../services/chatService';
import {aiService} from '../services/aiService';

const ChatScreen = ({route, navigation}) => {
  const {chatId, chatName, isAI} = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [chatData, setChatData] = useState(null);
  const giftedChatRef = useRef(null);

  useEffect(() => {
    loadChat();
    loadMessages();
  }, [chatId]);

  const loadChat = async () => {
    try {
      const chat = await chatService.getChat(chatId);
      setChatData(chat);
      navigation.setOptions({
        title: chat.name,
        headerRight: () => (
          <View style={styles.headerButtons}>
            {isAI && (
              <IconButton
                icon="robot"
                size={24}
                iconColor={theme.colors.onPrimary}
                onPress={() => navigation.navigate('AISettings')}
              />
            )}
            <IconButton
              icon="dots-vertical"
              size={24}
              iconColor={theme.colors.onPrimary}
              onPress={showChatOptions}
            />
          </View>
        ),
      });
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const chatMessages = await chatService.getMessages(chatId);

      // Convert messages to GiftedChat format
      const formattedMessages = chatMessages.map(msg => ({
        _id: msg.id,
        text: msg.text,
        createdAt: new Date(msg.timestamp),
        user: {
          _id: msg.senderId,
          name: msg.senderName || (msg.senderId === 'ai' ? 'AI Assistant' : 'You'),
          avatar: msg.senderId === 'ai' ? '🤖' : '👤',
        },
        pending: msg.pending || false,
        system: msg.type === 'system',
      }));

      setMessages(formattedMessages.reverse());
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSend = async (newMessages = []) => {
    const message = newMessages[0];

    // Add user message immediately
    setMessages(previousMessages =>
      GiftedChat.append(previousMessages, newMessages)
    );

    try {
      // Save user message
      await chatService.saveMessage(chatId, {
        text: message.text,
        senderId: 'user',
        senderName: 'You',
        timestamp: message.createdAt.toISOString(),
      });

      // If it's an AI chat, get AI response
      if (isAI) {
        await handleAIResponse(message.text);
      }

      // Update chat's last message
      await chatService.updateChatLastMessage(chatId, message.text);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleAIResponse = async (userMessage) => {
    setAiTyping(true);

    try {
      // Get conversation context
      const recentMessages = messages
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          role: msg.user._id === 'ai' ? 'assistant' : 'user',
          content: msg.text,
        }));

      const aiResponse = await aiService.generateResponse(userMessage, recentMessages);

      if (aiResponse) {
        const aiMessage = {
          _id: Date.now().toString(),
          text: aiResponse,
          createdAt: new Date(),
          user: {
            _id: 'ai',
            name: 'AI Assistant',
            avatar: '🤖',
          },
        };

        setMessages(previousMessages =>
          GiftedChat.append(previousMessages, [aiMessage])
        );

        // Save AI message
        await chatService.saveMessage(chatId, {
          text: aiResponse,
          senderId: 'ai',
          senderName: 'AI Assistant',
          timestamp: new Date().toISOString(),
        });

        // Update chat's last message
        await chatService.updateChatLastMessage(chatId, aiResponse);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);

      const errorMessage = {
        _id: Date.now().toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date(),
        user: {
          _id: 'ai',
          name: 'AI Assistant',
          avatar: '🤖',
        },
      };

      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, [errorMessage])
      );
    } finally {
      setAiTyping(false);
    }
  };

  const showChatOptions = () => {
    Alert.alert(
      'Chat Options',
      'Choose an action',
      [
        {
          text: 'Clear Chat',
          onPress: clearChat,
        },
        {
          text: 'Export Chat',
          onPress: exportChat,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.clearMessages(chatId);
              setMessages([]);
            } catch (error) {
              console.error('Error clearing chat:', error);
              Alert.alert('Error', 'Failed to clear chat');
            }
          },
        },
      ]
    );
  };

  const exportChat = async () => {
    try {
      const exportData = await chatService.exportChat(chatId);
      // Here you could implement sharing functionality
      Alert.alert('Export', 'Chat exported successfully');
    } catch (error) {
      console.error('Error exporting chat:', error);
      Alert.alert('Error', 'Failed to export chat');
    }
  };

  const renderBubble = (props) => {
    const isAIMessage = props.currentMessage.user._id === 'ai';
    const isUserMessage = props.currentMessage.user._id === 'user';

    return (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: isAIMessage
              ? theme.colors.chatBubble.ai
              : theme.colors.chatBubble.received,
          },
          right: {
            backgroundColor: theme.colors.chatBubble.sent,
          },
        }}
        textStyle={{
          left: {
            color: isAIMessage
              ? theme.colors.textOnBubble.ai
              : theme.colors.textOnBubble.received,
          },
          right: {
            color: theme.colors.textOnBubble.sent,
          },
        }}
      />
    );
  };

  const renderInputToolbar = (props) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputContainer}
      />
    );
  };

  const renderSend = (props) => {
    return (
      <Send {...props} containerStyle={styles.sendButton}>
        <IconButton
          icon="send"
          size={24}
          iconColor={theme.colors.primary}
        />
      </Send>
    );
  };

  const renderFooter = () => {
    if (aiTyping) {
      return (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.typingText}>AI is typing...</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <GiftedChat
        ref={giftedChatRef}
        messages={messages}
        onSend={onSend}
        user={{
          _id: 'user',
          name: 'You',
          avatar: '👤',
        }}
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        renderFooter={renderFooter}
        placeholder="Type a message..."
        showUserAvatar={false}
        showAvatarForEveryMessage={true}
        scrollToBottom
        scrollToBottomComponent={() => (
          <IconButton
            icon="chevron-down"
            size={24}
            iconColor={theme.colors.primary}
          />
        )}
        maxInputLength={1000}
        textInputStyle={styles.textInput}
        alwaysShowSend={true}
        keyboardShouldPersistTaps="never"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 16,
  },
  inputToolbar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.disabled,
    borderTopWidth: 1,
    paddingHorizontal: theme.spacing.sm,
  },
  inputContainer: {
    alignItems: 'center',
  },
  textInput: {
    fontSize: 16,
    color: theme.colors.text,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  typingText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.placeholder,
    fontStyle: 'italic',
  },
});

export default ChatScreen;
