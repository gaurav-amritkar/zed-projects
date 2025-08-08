import React, {useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Switch,
  Divider,
  List,
  Portal,
  Dialog,
  RadioButton,
  Slider,
  ActivityIndicator,
} from 'react-native-paper';
import {theme} from '../utils/theme';
import {aiService} from '../services/aiService';

const AISettingsScreen = ({navigation}) => {
  const [settings, setSettings] = useState({
    baseURL: '',
    apiKey: '',
    model: '',
    maxTokens: 500,
    temperature: 0.7,
    systemPrompt: '',
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showEndpointDialog, setShowEndpointDialog] = useState(false);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [presetEndpoints] = useState(aiService.getPresetEndpoints());
  const [selectedEndpoint, setSelectedEndpoint] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const systemInfo = await aiService.getSystemInfo();
      setSettings({
        baseURL: systemInfo.currentEndpoint,
        apiKey: systemInfo.hasApiKey ? '••••••••••••••••' : '',
        model: systemInfo.currentModel,
        maxTokens: systemInfo.maxTokens,
        temperature: systemInfo.temperature,
        systemPrompt: systemInfo.systemPrompt,
      });

      // Set available models based on endpoint
      updateAvailableModels(systemInfo.currentEndpoint);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableModels = (endpoint) => {
    const allModels = aiService.getAvailableModels();
    let models = [];

    if (endpoint.includes('ollama')) {
      models = allModels.ollama;
    } else if (endpoint.includes('localhost:8080') || endpoint.includes('localai')) {
      models = allModels.localai;
    } else if (endpoint.includes('localhost:5000')) {
      models = allModels.textgen;
    } else {
      models = allModels.openai;
    }

    setAvailableModels(models);
  };

  const saveSettings = async () => {
    try {
      setLoading(true);

      const settingsToSave = {
        baseURL: settings.baseURL,
        model: settings.model,
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        systemPrompt: settings.systemPrompt,
      };

      // Only update API key if it's not the masked value
      if (settings.apiKey && settings.apiKey !== '••••••••••••••••') {
        settingsToSave.apiKey = settings.apiKey;
      }

      await aiService.saveSettings(settingsToSave);
      Alert.alert('Success', 'AI settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);

      // Save settings first
      await saveSettings();

      const result = await aiService.testConnection();

      if (result.success) {
        Alert.alert(
          'Connection Test Successful',
          `Response: ${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}`
        );
      } else {
        Alert.alert('Connection Test Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Connection Test Failed', error.message);
    } finally {
      setTesting(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all AI settings to default values?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await aiService.clearSettings();
              await loadSettings();
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const selectEndpoint = (endpoint) => {
    const url = presetEndpoints[endpoint];
    setSettings(prev => ({...prev, baseURL: url}));
    setSelectedEndpoint(endpoint);
    updateAvailableModels(url);
    setShowEndpointDialog(false);
  };

  const selectModel = (model) => {
    setSettings(prev => ({...prev, model}));
    setShowModelDialog(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Endpoint Configuration */}
        <Card style={styles.card}>
          <Card.Title title="AI Service Configuration" />
          <Card.Content>
            <Text style={styles.sectionDescription}>
              Configure your AI service endpoint and authentication
            </Text>

            <Button
              mode="outlined"
              onPress={() => setShowEndpointDialog(true)}
              style={styles.button}>
              Select Endpoint Preset
            </Button>

            <TextInput
              label="API Endpoint URL"
              value={settings.baseURL}
              onChangeText={(text) => setSettings(prev => ({...prev, baseURL: text}))}
              placeholder="https://api.openai.com/v1"
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="API Key (optional for local services)"
              value={settings.apiKey}
              onChangeText={(text) => setSettings(prev => ({...prev, apiKey: text}))}
              placeholder="Enter your API key"
              secureTextEntry={settings.apiKey !== '••••••••••••••••'}
              style={styles.input}
              mode="outlined"
            />

            <Button
              mode="outlined"
              onPress={() => setShowModelDialog(true)}
              style={styles.button}
              disabled={availableModels.length === 0}>
              Select Model: {settings.model || 'None selected'}
            </Button>
          </Card.Content>
        </Card>

        {/* Model Parameters */}
        <Card style={styles.card}>
          <Card.Title title="Model Parameters" />
          <Card.Content>
            <Text style={styles.sectionDescription}>
              Fine-tune the AI model's behavior and response characteristics
            </Text>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                Max Tokens: {settings.maxTokens}
              </Text>
              <Text style={styles.sliderDescription}>
                Maximum length of AI responses (50-2000)
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={50}
                maximumValue={2000}
                step={50}
                value={settings.maxTokens}
                onValueChange={(value) =>
                  setSettings(prev => ({...prev, maxTokens: Math.round(value)}))
                }
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.disabled}
                thumbStyle={{backgroundColor: theme.colors.primary}}
              />
            </View>

            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                Temperature: {settings.temperature.toFixed(1)}
              </Text>
              <Text style={styles.sliderDescription}>
                Creativity level (0.0 = focused, 1.0 = creative)
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0.0}
                maximumValue={1.0}
                step={0.1}
                value={settings.temperature}
                onValueChange={(value) =>
                  setSettings(prev => ({...prev, temperature: parseFloat(value.toFixed(1))}))
                }
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.disabled}
                thumbStyle={{backgroundColor: theme.colors.primary}}
              />
            </View>
          </Card.Content>
        </Card>

        {/* System Prompt */}
        <Card style={styles.card}>
          <Card.Title title="System Prompt" />
          <Card.Content>
            <Text style={styles.sectionDescription}>
              Define the AI's personality and behavior instructions
            </Text>

            <TextInput
              label="System Prompt"
              value={settings.systemPrompt}
              onChangeText={(text) => setSettings(prev => ({...prev, systemPrompt: text}))}
              placeholder="You are a helpful AI assistant..."
              multiline
              numberOfLines={4}
              style={styles.textArea}
              mode="outlined"
            />
          </Card.Content>
        </Card>

        {/* Quick Setup Guides */}
        <Card style={styles.card}>
          <Card.Title title="Quick Setup Guides" />
          <Card.Content>
            <List.Item
              title="Ollama (Local)"
              description="Run AI models locally with Ollama"
              left={() => <List.Icon icon="download" />}
              onPress={() => {
                Alert.alert(
                  'Ollama Setup',
                  '1. Install Ollama from https://ollama.ai\n2. Run: ollama pull llama2\n3. Set endpoint to: http://localhost:11434/api/generate\n4. Select llama2 model'
                );
              }}
            />
            <List.Item
              title="LocalAI (Docker)"
              description="Self-hosted OpenAI-compatible API"
              left={() => <List.Icon icon="docker" />}
              onPress={() => {
                Alert.alert(
                  'LocalAI Setup',
                  '1. Run: docker run -p 8080:8080 localai/localai\n2. Set endpoint to: http://localhost:8080/v1\n3. No API key required'
                );
              }}
            />
            <List.Item
              title="Text Generation WebUI"
              description="Advanced interface for running language models"
              left={() => <List.Icon icon="web" />}
              onPress={() => {
                Alert.alert(
                  'Text Generation WebUI Setup',
                  '1. Install from GitHub: oobabooga/text-generation-webui\n2. Enable API mode: --api\n3. Set endpoint to: http://localhost:5000/api/v1'
                );
              }}
            />
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={testConnection}
            loading={testing}
            disabled={!settings.baseURL || testing}
            style={[styles.button, styles.primaryButton]}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>

          <Button
            mode="contained"
            onPress={saveSettings}
            loading={loading}
            disabled={loading}
            style={[styles.button, styles.primaryButton]}>
            Save Settings
          </Button>

          <Button
            mode="outlined"
            onPress={resetToDefaults}
            style={styles.button}>
            Reset to Defaults
          </Button>
        </View>
      </ScrollView>

      {/* Endpoint Selection Dialog */}
      <Portal>
        <Dialog
          visible={showEndpointDialog}
          onDismiss={() => setShowEndpointDialog(false)}>
          <Dialog.Title>Select AI Service</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={selectEndpoint}
              value={selectedEndpoint}>
              {Object.keys(presetEndpoints).map((endpoint) => (
                <RadioButton.Item
                  key={endpoint}
                  label={endpoint}
                  value={endpoint}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEndpointDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Model Selection Dialog */}
      <Portal>
        <Dialog
          visible={showModelDialog}
          onDismiss={() => setShowModelDialog(false)}>
          <Dialog.Title>Select Model</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={selectModel}
              value={settings.model}>
              {availableModels.map((model) => (
                <RadioButton.Item
                  key={model}
                  label={model}
                  value={model}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowModelDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.md,
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
  card: {
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  sectionDescription: {
    color: theme.colors.placeholder,
    fontSize: 14,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  input: {
    marginBottom: theme.spacing.md,
  },
  textArea: {
    marginBottom: theme.spacing.md,
    minHeight: 100,
  },
  button: {
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonContainer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  sliderContainer: {
    marginBottom: theme.spacing.lg,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sliderDescription: {
    fontSize: 12,
    color: theme.colors.placeholder,
    marginBottom: theme.spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default AISettingsScreen;
