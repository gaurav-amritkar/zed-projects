import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import {
  Text,
  List,
  Switch,
  Divider,
  Card,
  Button,
  Dialog,
  Portal,
  RadioButton,
  ActivityIndicator,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import {theme, darkTheme} from '../utils/theme';
import {chatService} from '../services/chatService';
import {aiService} from '../services/aiService';

const SettingsScreen = ({navigation}) => {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoBackup: true,
    soundEnabled: true,
    vibrationEnabled: true,
    fontSize: 'medium',
    language: 'en',
    dataUsage: 'wifi',
  });
  const [loading, setLoading] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [showFontSizeDialog, setShowFontSizeDialog] = useState(false);
  const [showDataUsageDialog, setShowDataUsageDialog] = useState(false);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    loadSettings();
    getAppInfo();
    loadStatistics();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const updatedSettings = {...settings, ...newSettings};
      setSettings(updatedSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const getAppInfo = async () => {
    try {
      const version = await DeviceInfo.getVersion();
      setAppVersion(version);
    } catch (error) {
      console.error('Error getting app info:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await chatService.getAllStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your chats, messages, and settings. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await chatService.clearAllData();
              await aiService.clearSettings();
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data has been cleared');
              // Reset settings to defaults
              setSettings({
                notifications: true,
                darkMode: false,
                autoBackup: true,
                soundEnabled: true,
                vibrationEnabled: true,
                fontSize: 'medium',
                language: 'en',
                dataUsage: 'wifi',
              });
              setStatistics(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const exportAllData = async () => {
    try {
      setLoading(true);
      const exportData = await chatService.exportAllChats();

      // In a real app, you would use react-native-share or similar
      // For now, we'll just show a success message
      Alert.alert(
        'Export Complete',
        'Your chat data has been prepared for export. In a production app, this would be saved to your device or shared.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldMessages = () => {
    Alert.alert(
      'Cleanup Old Messages',
      'This will delete messages older than 30 days to free up storage space.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Cleanup',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await chatService.cleanupOldMessages(30);
              Alert.alert(
                'Cleanup Complete',
                `Removed ${result.cleanedMessages} old messages`
              );
              loadStatistics();
            } catch (error) {
              Alert.alert('Error', 'Failed to cleanup messages');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openURL = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  const showAbout = () => {
    Alert.alert(
      'About',
      `React Native Messaging App

Version: ${appVersion}

A lightweight messaging app with AI integration built with React Native. Features include:

• Local message storage
• Open-source AI integration
• Multiple AI service support
• Export/Import functionality
• Dark mode support
• Customizable settings

Built with ❤️ using React Native`
    );
  };

  const themeOptions = [
    {label: 'Light', value: 'light'},
    {label: 'Dark', value: 'dark'},
    {label: 'System', value: 'system'},
  ];

  const fontSizeOptions = [
    {label: 'Small', value: 'small'},
    {label: 'Medium', value: 'medium'},
    {label: 'Large', value: 'large'},
  ];

  const dataUsageOptions = [
    {label: 'WiFi Only', value: 'wifi'},
    {label: 'WiFi + Mobile Data', value: 'both'},
    {label: 'Mobile Data Only', value: 'mobile'},
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Section */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.profileSection}>
            <Text style={styles.profileName}>User</Text>
            <Text style={styles.profileDescription}>
              Messaging App User
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Statistics */}
      {statistics && (
        <Card style={styles.card}>
          <Card.Title title="Usage Statistics" />
          <Card.Content>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Total Chats:</Text>
              <Text style={styles.statsValue}>{statistics.totalChats}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Total Messages:</Text>
              <Text style={styles.statsValue}>{statistics.totalMessages}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>AI Chats:</Text>
              <Text style={styles.statsValue}>{statistics.aiChats}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Average Words/Message:</Text>
              <Text style={styles.statsValue}>
                {Math.round(statistics.averageWordsPerMessage)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Notifications */}
      <Card style={styles.card}>
        <Card.Title title="Notifications" />
        <Card.Content>
          <List.Item
            title="Enable Notifications"
            description="Receive notifications for new messages"
            right={() => (
              <Switch
                value={settings.notifications}
                onValueChange={(value) => saveSettings({notifications: value})}
              />
            )}
          />
          <List.Item
            title="Sound"
            description="Play notification sounds"
            right={() => (
              <Switch
                value={settings.soundEnabled}
                onValueChange={(value) => saveSettings({soundEnabled: value})}
                disabled={!settings.notifications}
              />
            )}
          />
          <List.Item
            title="Vibration"
            description="Vibrate for notifications"
            right={() => (
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={(value) => saveSettings({vibrationEnabled: value})}
                disabled={!settings.notifications}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* Appearance */}
      <Card style={styles.card}>
        <Card.Title title="Appearance" />
        <Card.Content>
          <List.Item
            title="Theme"
            description={`Current: ${settings.darkMode ? 'Dark' : 'Light'}`}
            left={() => <List.Icon icon="palette" />}
            onPress={() => setShowThemeDialog(true)}
          />
          <List.Item
            title="Font Size"
            description={`Current: ${settings.fontSize}`}
            left={() => <List.Icon icon="format-size" />}
            onPress={() => setShowFontSizeDialog(true)}
          />
        </Card.Content>
      </Card>

      {/* Data & Storage */}
      <Card style={styles.card}>
        <Card.Title title="Data & Storage" />
        <Card.Content>
          <List.Item
            title="Data Usage"
            description={`AI requests: ${settings.dataUsage}`}
            left={() => <List.Icon icon="wifi" />}
            onPress={() => setShowDataUsageDialog(true)}
          />
          <List.Item
            title="Auto Backup"
            description="Automatically backup chats"
            left={() => <List.Icon icon="backup-restore" />}
            right={() => (
              <Switch
                value={settings.autoBackup}
                onValueChange={(value) => saveSettings({autoBackup: value})}
              />
            )}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Export All Data"
            description="Export all chats and messages"
            left={() => <List.Icon icon="export" />}
            onPress={exportAllData}
          />
          <List.Item
            title="Cleanup Old Messages"
            description="Remove messages older than 30 days"
            left={() => <List.Icon icon="broom" />}
            onPress={cleanupOldMessages}
          />
          <List.Item
            title="Clear All Data"
            description="Permanently delete all data"
            left={() => <List.Icon icon="delete-forever" />}
            onPress={clearAllData}
          />
        </Card.Content>
      </Card>

      {/* AI Settings */}
      <Card style={styles.card}>
        <Card.Title title="AI Configuration" />
        <Card.Content>
          <List.Item
            title="AI Settings"
            description="Configure AI service and parameters"
            left={() => <List.Icon icon="robot" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => navigation.navigate('AISettings')}
          />
        </Card.Content>
      </Card>

      {/* Help & Support */}
      <Card style={styles.card}>
        <Card.Title title="Help & Support" />
        <Card.Content>
          <List.Item
            title="Help Center"
            description="Get help and tutorials"
            left={() => <List.Icon icon="help-circle" />}
            onPress={() => openURL('https://github.com/yourusername/messaging-app/wiki')}
          />
          <List.Item
            title="Report Bug"
            description="Report issues or bugs"
            left={() => <List.Icon icon="bug" />}
            onPress={() => openURL('https://github.com/yourusername/messaging-app/issues')}
          />
          <List.Item
            title="Feature Request"
            description="Suggest new features"
            left={() => <List.Icon icon="lightbulb" />}
            onPress={() => openURL('https://github.com/yourusername/messaging-app/discussions')}
          />
          <List.Item
            title="About"
            description={`Version ${appVersion}`}
            left={() => <List.Icon icon="information" />}
            onPress={showAbout}
          />
        </Card.Content>
      </Card>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      {/* Theme Selection Dialog */}
      <Portal>
        <Dialog visible={showThemeDialog} onDismiss={() => setShowThemeDialog(false)}>
          <Dialog.Title>Select Theme</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => {
                saveSettings({darkMode: value === 'dark'});
                setShowThemeDialog(false);
              }}
              value={settings.darkMode ? 'dark' : 'light'}>
              {themeOptions.map((option) => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowThemeDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Font Size Selection Dialog */}
      <Portal>
        <Dialog visible={showFontSizeDialog} onDismiss={() => setShowFontSizeDialog(false)}>
          <Dialog.Title>Select Font Size</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => {
                saveSettings({fontSize: value});
                setShowFontSizeDialog(false);
              }}
              value={settings.fontSize}>
              {fontSizeOptions.map((option) => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowFontSizeDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Data Usage Selection Dialog */}
      <Portal>
        <Dialog visible={showDataUsageDialog} onDismiss={() => setShowDataUsageDialog(false)}>
          <Dialog.Title>Data Usage for AI</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => {
                saveSettings({dataUsage: value});
                setShowDataUsageDialog(false);
              }}
              value={settings.dataUsage}>
              {dataUsageOptions.map((option) => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDataUsageDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  profileDescription: {
    fontSize: 16,
    color: theme.colors.placeholder,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  statsLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  divider: {
    marginVertical: theme.spacing.sm,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.onPrimary,
    fontSize: 16,
  },
  footer: {
    height: theme.spacing.xl,
  },
});

export default SettingsScreen;
