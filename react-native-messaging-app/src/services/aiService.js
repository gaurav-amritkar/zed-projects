import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AIService {
  constructor() {
    this.baseURL = 'https://api.openai.com/v1'; // Default to OpenAI-compatible API
    this.apiKey = '';
    this.model = 'gpt-3.5-turbo';
    this.maxTokens = 500;
    this.temperature = 0.7;
    this.systemPrompt = 'You are a helpful AI assistant in a messaging app. Be concise, friendly, and helpful in your responses.';

    // Alternative open-source endpoints
    this.openSourceEndpoints = {
      ollama: 'http://localhost:11434/api/generate',
      localai: 'http://localhost:8080/v1/chat/completions',
      textgen: 'http://localhost:5000/api/v1/chat',
      koboldcpp: 'http://localhost:5001/api/v1/generate',
    };

    this.loadSettings();
  }

  async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('ai_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        this.baseURL = parsedSettings.baseURL || this.baseURL;
        this.apiKey = parsedSettings.apiKey || this.apiKey;
        this.model = parsedSettings.model || this.model;
        this.maxTokens = parsedSettings.maxTokens || this.maxTokens;
        this.temperature = parsedSettings.temperature || this.temperature;
        this.systemPrompt = parsedSettings.systemPrompt || this.systemPrompt;
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  }

  async saveSettings(settings) {
    try {
      const currentSettings = {
        baseURL: this.baseURL,
        apiKey: this.apiKey,
        model: this.model,
        maxTokens: this.maxTokens,
        temperature: this.temperature,
        systemPrompt: this.systemPrompt,
        ...settings,
      };

      await AsyncStorage.setItem('ai_settings', JSON.stringify(currentSettings));

      // Update instance properties
      Object.assign(this, currentSettings);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      throw new Error('Failed to save AI settings');
    }
  }

  async generateResponse(userMessage, conversationHistory = []) {
    try {
      // Check if we have required settings
      if (!this.baseURL) {
        throw new Error('AI service not configured. Please check settings.');
      }

      // Determine which AI service to use based on URL
      if (this.baseURL.includes('ollama')) {
        return await this.generateOllamaResponse(userMessage, conversationHistory);
      } else if (this.baseURL.includes('localhost:8080') || this.baseURL.includes('localai')) {
        return await this.generateLocalAIResponse(userMessage, conversationHistory);
      } else if (this.baseURL.includes('localhost:5000')) {
        return await this.generateTextGenResponse(userMessage, conversationHistory);
      } else {
        return await this.generateOpenAICompatibleResponse(userMessage, conversationHistory);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  async generateOpenAICompatibleResponse(userMessage, conversationHistory) {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  async generateOllamaResponse(userMessage, conversationHistory) {
    // Build context from conversation history
    let context = this.systemPrompt + '\n\n';
    conversationHistory.forEach(msg => {
      context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    context += `User: ${userMessage}\nAssistant: `;

    const response = await axios.post(
      this.baseURL,
      {
        model: this.model,
        prompt: context,
        stream: false,
        options: {
          temperature: this.temperature,
          num_predict: this.maxTokens,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    return response.data.response.trim();
  }

  async generateLocalAIResponse(userMessage, conversationHistory) {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  async generateTextGenResponse(userMessage, conversationHistory) {
    // Build conversation context
    let context = this.systemPrompt + '\n\n';
    conversationHistory.forEach(msg => {
      context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    context += `User: ${userMessage}\nAssistant: `;

    const response = await axios.post(
      `${this.baseURL}/chat`,
      {
        user_input: userMessage,
        max_new_tokens: this.maxTokens,
        temperature: this.temperature,
        context: context,
        regenerate: false,
        _continue: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    return response.data.results[0].history.visible[response.data.results[0].history.visible.length - 1][1];
  }

  async testConnection() {
    try {
      const testResponse = await this.generateResponse('Hello, this is a test message.');
      return { success: true, response: testResponse };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Connection test failed'
      };
    }
  }

  getAvailableModels() {
    return {
      openai: [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4-turbo-preview',
      ],
      ollama: [
        'llama2',
        'mistral',
        'codellama',
        'orca-mini',
        'vicuna',
        'alpaca',
      ],
      localai: [
        'gpt-3.5-turbo',
        'gpt4all-j',
        'cerebras',
        'rwkv',
      ],
      textgen: [
        'custom-model',
      ]
    };
  }

  getPresetEndpoints() {
    return {
      'OpenAI': 'https://api.openai.com/v1',
      'Ollama (Local)': 'http://localhost:11434/api/generate',
      'LocalAI (Local)': 'http://localhost:8080/v1',
      'Text Generation WebUI': 'http://localhost:5000/api/v1',
      'KoboldCpp': 'http://localhost:5001/api/v1',
      'Anthropic Claude': 'https://api.anthropic.com/v1',
      'Cohere': 'https://api.cohere.ai/v1',
      'Custom': '',
    };
  }

  async getSystemInfo() {
    return {
      currentEndpoint: this.baseURL,
      currentModel: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      hasApiKey: !!this.apiKey,
      systemPrompt: this.systemPrompt,
    };
  }

  async clearSettings() {
    try {
      await AsyncStorage.removeItem('ai_settings');

      // Reset to defaults
      this.baseURL = 'https://api.openai.com/v1';
      this.apiKey = '';
      this.model = 'gpt-3.5-turbo';
      this.maxTokens = 500;
      this.temperature = 0.7;
      this.systemPrompt = 'You are a helpful AI assistant in a messaging app. Be concise, friendly, and helpful in your responses.';
    } catch (error) {
      console.error('Error clearing AI settings:', error);
      throw new Error('Failed to clear AI settings');
    }
  }

  // Utility method to validate endpoint URL
  validateEndpoint(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Method to get conversation summary for long chats
  async summarizeConversation(messages) {
    try {
      const conversationText = messages.map(msg =>
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      const summary = await this.generateResponse(
        `Please provide a brief summary of this conversation:\n\n${conversationText}`,
        []
      );

      return summary;
    } catch (error) {
      console.error('Error summarizing conversation:', error);
      return 'Unable to generate conversation summary';
    }
  }
}

export const aiService = new AIService();
