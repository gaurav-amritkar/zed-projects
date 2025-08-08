import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Text, Avatar, Surface} from 'react-native-paper';
import {theme} from '../utils/theme';

const MessageBubble = ({
  message,
  isCurrentUser,
  isAI,
  showAvatar = true,
  showTimestamp = true,
  onPress,
  onLongPress,
}) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBubbleStyle = () => {
    if (isAI) {
      return {
        backgroundColor: theme.colors.chatBubble.ai,
        borderTopLeftRadius: 4,
        borderTopRightRadius: theme.roundness * 2,
        borderBottomLeftRadius: theme.roundness * 2,
        borderBottomRightRadius: theme.roundness * 2,
      };
    } else if (isCurrentUser) {
      return {
        backgroundColor: theme.colors.chatBubble.sent,
        borderTopLeftRadius: theme.roundness * 2,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: theme.roundness * 2,
        borderBottomRightRadius: theme.roundness * 2,
      };
    } else {
      return {
        backgroundColor: theme.colors.chatBubble.received,
        borderTopLeftRadius: 4,
        borderTopRightRadius: theme.roundness * 2,
        borderBottomLeftRadius: theme.roundness * 2,
        borderBottomRightRadius: theme.roundness * 2,
      };
    }
  };

  const getTextColor = () => {
    if (isAI) {
      return theme.colors.textOnBubble.ai;
    } else if (isCurrentUser) {
      return theme.colors.textOnBubble.sent;
    } else {
      return theme.colors.textOnBubble.received;
    }
  };

  const renderAvatar = () => {
    if (!showAvatar || isCurrentUser) return null;

    return (
      <Avatar.Icon
        size={32}
        icon={isAI ? 'robot' : 'account'}
        style={[
          styles.avatar,
          {
            backgroundColor: isAI
              ? theme.colors.secondary
              : theme.colors.primary,
          },
        ]}
      />
    );
  };

  const renderMessageStatus = () => {
    if (!isCurrentUser || !message.status) return null;

    const getStatusIcon = () => {
      switch (message.status) {
        case 'sending':
          return '⏳';
        case 'sent':
          return '✓';
        case 'delivered':
          return '✓✓';
        case 'read':
          return '✓✓';
        case 'failed':
          return '❌';
        default:
          return '';
      }
    };

    return (
      <Text style={styles.statusIcon}>
        {getStatusIcon()}
      </Text>
    );
  };

  return (
    <View
      style={[
        styles.container,
        isCurrentUser ? styles.sentContainer : styles.receivedContainer,
      ]}>
      {renderAvatar()}

      <View style={[styles.messageContainer, isCurrentUser && styles.sentMessageContainer]}>
        <TouchableOpacity
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.7}>
          <Surface style={[styles.bubble, getBubbleStyle()]} elevation={1}>
            {!isCurrentUser && !isAI && (
              <Text style={styles.senderName}>
                {message.senderName || 'Unknown'}
              </Text>
            )}

            <Text style={[styles.messageText, {color: getTextColor()}]}>
              {message.text}
            </Text>

            {showTimestamp && (
              <View style={styles.timestampContainer}>
                <Text style={[styles.timestamp, {color: getTextColor()}]}>
                  {formatTime(message.createdAt || message.timestamp)}
                </Text>
                {renderMessageStatus()}
              </View>
            )}
          </Surface>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'flex-end',
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  messageContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  sentMessageContainer: {
    marginLeft: theme.spacing.xl,
    marginRight: 0,
  },
  avatar: {
    marginBottom: theme.spacing.xs,
  },
  bubble: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxWidth: '100%',
    minWidth: 60,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: theme.colors.text,
  },
  timestampContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.7,
    fontWeight: '400',
  },
  statusIcon: {
    fontSize: 10,
    marginLeft: theme.spacing.xs,
    opacity: 0.7,
  },
});

export default MessageBubble;
