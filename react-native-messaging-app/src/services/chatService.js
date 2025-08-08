import AsyncStorage from '@react-native-async-storage/async-storage';
import {v4 as uuidv4} from 'react-native-uuid';

class ChatService {
  constructor() {
    this.storageKeys = {
      chats: 'app_chats',
      messages: 'app_messages_',
      settings: 'app_chat_settings',
    };
  }

  // Chat Management
  async getAllChats() {
    try {
      const chatsData = await AsyncStorage.getItem(this.storageKeys.chats);
      const chats = chatsData ? JSON.parse(chatsData) : [];

      // Sort by last message time (most recent first)
      return chats.sort((a, b) =>
        new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0)
      );
    } catch (error) {
      console.error('Error loading chats:', error);
      return [];
    }
  }

  async getChat(chatId) {
    try {
      const chats = await this.getAllChats();
      return chats.find(chat => chat.id === chatId);
    } catch (error) {
      console.error('Error getting chat:', error);
      return null;
    }
  }

  async createChat(chatData) {
    try {
      const newChat = {
        id: uuidv4(),
        name: chatData.name || 'New Chat',
        isAI: chatData.isAI || false,
        participants: chatData.participants || ['user'],
        createdAt: new Date().toISOString(),
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        settings: {
          notifications: true,
          archived: false,
          pinned: false,
        },
        ...chatData,
      };

      const chats = await this.getAllChats();
      chats.push(newChat);

      await AsyncStorage.setItem(this.storageKeys.chats, JSON.stringify(chats));
      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw new Error('Failed to create chat');
    }
  }

  async updateChat(chatId, updates) {
    try {
      const chats = await this.getAllChats();
      const chatIndex = chats.findIndex(chat => chat.id === chatId);

      if (chatIndex === -1) {
        throw new Error('Chat not found');
      }

      chats[chatIndex] = {
        ...chats[chatIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.storageKeys.chats, JSON.stringify(chats));
      return chats[chatIndex];
    } catch (error) {
      console.error('Error updating chat:', error);
      throw new Error('Failed to update chat');
    }
  }

  async deleteChat(chatId) {
    try {
      // Delete messages first
      await AsyncStorage.removeItem(this.storageKeys.messages + chatId);

      // Remove chat from list
      const chats = await this.getAllChats();
      const filteredChats = chats.filter(chat => chat.id !== chatId);

      await AsyncStorage.setItem(this.storageKeys.chats, JSON.stringify(filteredChats));
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw new Error('Failed to delete chat');
    }
  }

  async updateChatLastMessage(chatId, message) {
    try {
      await this.updateChat(chatId, {
        lastMessage: message,
        lastMessageTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating last message:', error);
    }
  }

  // Message Management
  async getMessages(chatId) {
    try {
      const messagesData = await AsyncStorage.getItem(this.storageKeys.messages + chatId);
      const messages = messagesData ? JSON.parse(messagesData) : [];

      // Sort by timestamp (oldest first for chat display)
      return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  }

  async saveMessage(chatId, messageData) {
    try {
      const newMessage = {
        id: uuidv4(),
        text: messageData.text,
        senderId: messageData.senderId,
        senderName: messageData.senderName || 'Unknown',
        timestamp: messageData.timestamp || new Date().toISOString(),
        type: messageData.type || 'text',
        status: messageData.status || 'sent', // sent, delivered, read
        metadata: messageData.metadata || {},
        ...messageData,
      };

      const messages = await this.getMessages(chatId);
      messages.push(newMessage);

      await AsyncStorage.setItem(
        this.storageKeys.messages + chatId,
        JSON.stringify(messages)
      );

      return newMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error('Failed to save message');
    }
  }

  async updateMessage(chatId, messageId, updates) {
    try {
      const messages = await this.getMessages(chatId);
      const messageIndex = messages.findIndex(msg => msg.id === messageId);

      if (messageIndex === -1) {
        throw new Error('Message not found');
      }

      messages[messageIndex] = {
        ...messages[messageIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        this.storageKeys.messages + chatId,
        JSON.stringify(messages)
      );

      return messages[messageIndex];
    } catch (error) {
      console.error('Error updating message:', error);
      throw new Error('Failed to update message');
    }
  }

  async deleteMessage(chatId, messageId) {
    try {
      const messages = await this.getMessages(chatId);
      const filteredMessages = messages.filter(msg => msg.id !== messageId);

      await AsyncStorage.setItem(
        this.storageKeys.messages + chatId,
        JSON.stringify(filteredMessages)
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  async clearMessages(chatId) {
    try {
      await AsyncStorage.removeItem(this.storageKeys.messages + chatId);

      // Update chat's last message
      await this.updateChat(chatId, {
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw new Error('Failed to clear messages');
    }
  }

  // Search functionality
  async searchMessages(query, chatId = null) {
    try {
      const results = [];

      if (chatId) {
        // Search in specific chat
        const messages = await this.getMessages(chatId);
        const filteredMessages = messages.filter(msg =>
          msg.text.toLowerCase().includes(query.toLowerCase())
        );
        results.push({ chatId, messages: filteredMessages });
      } else {
        // Search in all chats
        const chats = await this.getAllChats();

        for (const chat of chats) {
          const messages = await this.getMessages(chat.id);
          const filteredMessages = messages.filter(msg =>
            msg.text.toLowerCase().includes(query.toLowerCase())
          );

          if (filteredMessages.length > 0) {
            results.push({
              chatId: chat.id,
              chatName: chat.name,
              messages: filteredMessages
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  // Export/Import functionality
  async exportChat(chatId) {
    try {
      const chat = await this.getChat(chatId);
      const messages = await this.getMessages(chatId);

      if (!chat) {
        throw new Error('Chat not found');
      }

      const exportData = {
        chat,
        messages,
        exportDate: new Date().toISOString(),
        version: '1.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting chat:', error);
      throw new Error('Failed to export chat');
    }
  }

  async exportAllChats() {
    try {
      const chats = await this.getAllChats();
      const allData = {
        chats: [],
        exportDate: new Date().toISOString(),
        version: '1.0',
      };

      for (const chat of chats) {
        const messages = await this.getMessages(chat.id);
        allData.chats.push({
          chat,
          messages,
        });
      }

      return JSON.stringify(allData, null, 2);
    } catch (error) {
      console.error('Error exporting all chats:', error);
      throw new Error('Failed to export all chats');
    }
  }

  async importChat(exportData) {
    try {
      const data = JSON.parse(exportData);

      if (data.version !== '1.0') {
        throw new Error('Unsupported export version');
      }

      let importedChats = 0;

      if (data.chat && data.messages) {
        // Single chat import
        const newChatId = uuidv4();
        const importedChat = {
          ...data.chat,
          id: newChatId,
          importedAt: new Date().toISOString(),
        };

        await this.createChat(importedChat);

        // Import messages with new IDs
        for (const message of data.messages) {
          await this.saveMessage(newChatId, {
            ...message,
            id: undefined, // Let saveMessage generate new ID
          });
        }

        importedChats = 1;
      } else if (data.chats) {
        // Multiple chats import
        for (const chatData of data.chats) {
          const newChatId = uuidv4();
          const importedChat = {
            ...chatData.chat,
            id: newChatId,
            importedAt: new Date().toISOString(),
          };

          await this.createChat(importedChat);

          for (const message of chatData.messages) {
            await this.saveMessage(newChatId, {
              ...message,
              id: undefined,
            });
          }

          importedChats++;
        }
      }

      return { success: true, importedChats };
    } catch (error) {
      console.error('Error importing chat:', error);
      throw new Error('Failed to import chat: ' + error.message);
    }
  }

  // Statistics
  async getChatStatistics(chatId) {
    try {
      const messages = await this.getMessages(chatId);
      const chat = await this.getChat(chatId);

      if (!chat) {
        throw new Error('Chat not found');
      }

      const userMessages = messages.filter(msg => msg.senderId === 'user');
      const aiMessages = messages.filter(msg => msg.senderId === 'ai');
      const otherMessages = messages.filter(msg =>
        msg.senderId !== 'user' && msg.senderId !== 'ai'
      );

      const totalWords = messages.reduce((count, msg) =>
        count + msg.text.split(' ').length, 0
      );

      const firstMessage = messages.length > 0 ? messages[0] : null;
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

      return {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        aiMessages: aiMessages.length,
        otherMessages: otherMessages.length,
        totalWords,
        averageWordsPerMessage: messages.length > 0 ? totalWords / messages.length : 0,
        firstMessageDate: firstMessage?.timestamp,
        lastMessageDate: lastMessage?.timestamp,
        chatCreatedDate: chat.createdAt,
        isAIChat: chat.isAI,
      };
    } catch (error) {
      console.error('Error getting chat statistics:', error);
      return null;
    }
  }

  async getAllStatistics() {
    try {
      const chats = await this.getAllChats();
      let totalMessages = 0;
      let totalWords = 0;
      let aiChats = 0;
      let regularChats = 0;

      for (const chat of chats) {
        const messages = await this.getMessages(chat.id);
        totalMessages += messages.length;

        const words = messages.reduce((count, msg) =>
          count + msg.text.split(' ').length, 0
        );
        totalWords += words;

        if (chat.isAI) {
          aiChats++;
        } else {
          regularChats++;
        }
      }

      return {
        totalChats: chats.length,
        aiChats,
        regularChats,
        totalMessages,
        totalWords,
        averageMessagesPerChat: chats.length > 0 ? totalMessages / chats.length : 0,
        averageWordsPerMessage: totalMessages > 0 ? totalWords / totalMessages : 0,
      };
    } catch (error) {
      console.error('Error getting all statistics:', error);
      return null;
    }
  }

  // Cleanup and maintenance
  async cleanupOldMessages(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const chats = await this.getAllChats();
      let cleanedMessages = 0;

      for (const chat of chats) {
        const messages = await this.getMessages(chat.id);
        const filteredMessages = messages.filter(msg =>
          new Date(msg.timestamp) > cutoffDate
        );

        if (filteredMessages.length !== messages.length) {
          await AsyncStorage.setItem(
            this.storageKeys.messages + chat.id,
            JSON.stringify(filteredMessages)
          );
          cleanedMessages += (messages.length - filteredMessages.length);
        }
      }

      return { cleanedMessages };
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
      throw new Error('Failed to cleanup old messages');
    }
  }

  async clearAllData() {
    try {
      const chats = await this.getAllChats();

      // Clear all message stores
      for (const chat of chats) {
        await AsyncStorage.removeItem(this.storageKeys.messages + chat.id);
      }

      // Clear chats
      await AsyncStorage.removeItem(this.storageKeys.chats);

      // Clear settings
      await AsyncStorage.removeItem(this.storageKeys.settings);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw new Error('Failed to clear all data');
    }
  }
}

export const chatService = new ChatService();
