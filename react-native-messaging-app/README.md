# React Native Messaging App with Open-Source AI

A lightweight, feature-rich messaging application built with React Native that integrates with open-source AI models. Perfect for mobile devices with a focus on privacy, customization, and local AI integration.

## Features

### 🚀 Core Messaging
- **Real-time Messaging**: Send and receive messages instantly
- **Chat Management**: Create, delete, and organize conversations
- **Message History**: Persistent local storage of all conversations
- **Search Functionality**: Find messages across all chats
- **Export/Import**: Backup and restore your chat data

### 🤖 AI Integration
- **Multiple AI Services**: Support for various open-source AI models
- **Local AI Support**: Run AI models locally with Ollama, LocalAI, etc.
- **Customizable AI**: Adjust temperature, max tokens, and system prompts
- **AI Chat Detection**: Visual indicators for AI-powered conversations
- **Conversation Context**: AI maintains context across the conversation

### 🎨 User Experience
- **Material Design**: Clean, modern interface using React Native Paper
- **Dark/Light Theme**: Automatic theme switching support
- **Responsive Design**: Optimized for various screen sizes
- **Intuitive Navigation**: Easy-to-use navigation between screens
- **Customizable Settings**: Personalize notifications, appearance, and behavior

### 🔧 Technical Features
- **Local Storage**: All data stored locally using AsyncStorage
- **No Backend Required**: Fully client-side application
- **Privacy-First**: No data collection or tracking
- **Cross-Platform**: Works on both iOS and Android
- **Lightweight**: Minimal dependencies and optimized performance

## Supported AI Services

### Local/Self-Hosted
- **Ollama**: Run models like Llama 2, Mistral, CodeLlama locally
- **LocalAI**: OpenAI-compatible API for local models
- **Text Generation WebUI**: Advanced interface for language models
- **KoboldCpp**: Lightweight local inference engine

### Cloud Services
- **OpenAI**: GPT-3.5, GPT-4 (requires API key)
- **Anthropic Claude**: Claude models (requires API key)
- **Cohere**: Cohere language models (requires API key)
- **Custom Endpoints**: Support for any OpenAI-compatible API

## Installation

### Prerequisites
- Node.js (version 16 or higher)
- React Native development environment
- iOS: Xcode (for iOS development)
- Android: Android Studio with SDK

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/react-native-messaging-app.git
   cd react-native-messaging-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **iOS Setup** (macOS only)
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Run the application**
   
   For iOS:
   ```bash
   npm run ios
   # or
   yarn ios
   ```
   
   For Android:
   ```bash
   npm run android
   # or
   yarn android
   ```

## AI Service Setup

### Ollama (Recommended for Local AI)

1. **Install Ollama**
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows
   # Download from https://ollama.ai
   ```

2. **Download a model**
   ```bash
   ollama pull llama2
   # or
   ollama pull mistral
   ```

3. **Start Ollama server**
   ```bash
   ollama serve
   ```

4. **Configure in app**
   - Open Settings → AI Settings
   - Select "Ollama (Local)" from presets
   - Choose your downloaded model
   - Test connection

### LocalAI (Docker)

1. **Run LocalAI**
   ```bash
   docker run -p 8080:8080 localai/localai
   ```

2. **Configure in app**
   - Open Settings → AI Settings
   - Select "LocalAI (Local)" from presets
   - Test connection

### OpenAI (Cloud)

1. **Get API Key**
   - Visit https://platform.openai.com/api-keys
   - Create a new API key

2. **Configure in app**
   - Open Settings → AI Settings
   - Select "OpenAI" from presets
   - Enter your API key
   - Choose model (gpt-3.5-turbo recommended)

## Usage Guide

### Creating Chats

1. **Regular Chat**: Tap the "+" button and select "Regular Chat"
2. **AI Chat**: Tap the "+" button and select "AI Chat"

### Configuring AI

1. Navigate to **Settings → AI Settings**
2. Choose your preferred AI service from presets
3. Configure model parameters:
   - **Max Tokens**: Response length (50-2000)
   - **Temperature**: Creativity level (0.0-1.0)
   - **System Prompt**: AI personality and instructions
4. Test the connection to ensure everything works

### Managing Data

- **Export Chats**: Settings → Data & Storage → Export All Data
- **Clear Old Messages**: Settings → Data & Storage → Cleanup Old Messages
- **Reset Everything**: Settings → Data & Storage → Clear All Data

## Configuration

### Environment Variables

Create a `.env` file in the root directory (optional):

```env
# Default AI settings
DEFAULT_AI_ENDPOINT=http://localhost:11434/api/generate
DEFAULT_AI_MODEL=llama2
DEFAULT_MAX_TOKENS=500
DEFAULT_TEMPERATURE=0.7
```

### Customization

#### Themes
Edit `src/utils/theme.js` to customize colors, fonts, and spacing.

#### AI Services
Add new AI services by extending the `aiService.js` file with new provider methods.

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Main application screens
│   ├── ChatListScreen.js
│   ├── ChatScreen.js
│   ├── AISettingsScreen.js
│   └── SettingsScreen.js
├── services/           # Business logic and API calls
│   ├── aiService.js    # AI integration service
│   └── chatService.js  # Chat and message management
└── utils/              # Utilities and helpers
    └── theme.js        # Theme configuration
```

### Adding New AI Services

1. Extend the `AIService` class in `src/services/aiService.js`
2. Add the new service endpoint to `getPresetEndpoints()`
3. Implement the service-specific API call method
4. Add available models to `getAvailableModels()`

### Building for Production

#### Android
```bash
npm run build:android
# APK will be generated in android/app/build/outputs/apk/release/
```

#### iOS
```bash
npm run build:ios
# Open the project in Xcode to archive and distribute
```

## Troubleshooting

### Common Issues

**AI Connection Fails**
- Verify the AI service is running (for local services)
- Check the endpoint URL format
- Ensure API key is correct (for cloud services)
- Test network connectivity

**Messages Not Saving**
- Check app permissions for storage
- Verify AsyncStorage is functioning
- Clear app data if corrupted

**Performance Issues**
- Clear old messages via Settings
- Restart the application
- Check available device storage

**iOS Build Errors**
- Run `cd ios && pod install`
- Clean build folder in Xcode
- Ensure proper iOS development setup

**Android Build Errors**
- Clean and rebuild: `cd android && ./gradlew clean`
- Check Android SDK and build tools versions
- Verify environment variables

### Debug Mode

Enable debug logging by setting up Flipper or using React Native Debugger:

```bash
npm install --global react-devtools
react-devtools
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow React Native and JavaScript best practices
- Use meaningful commit messages
- Add comments for complex logic
- Test on both iOS and Android
- Maintain backwards compatibility

## Privacy & Security

- **Local Storage**: All messages stored locally on device
- **No Analytics**: No usage tracking or data collection
- **Open Source**: Fully transparent codebase
- **API Keys**: Stored securely using React Native Keychain
- **Encryption**: Option to encrypt local storage (coming soon)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **React Native Community**: For the amazing framework and ecosystem
- **Material Design**: For the design system and components
- **Open Source AI Community**: For making AI accessible to everyone
- **Ollama Team**: For the excellent local AI inference platform

## Roadmap

### Upcoming Features
- [ ] End-to-end encryption
- [ ] Voice messages
- [ ] Image sharing
- [ ] Multi-language support
- [ ] Conversation summaries
- [ ] Plugin system for custom AI providers
- [ ] Real-time sync across devices
- [ ] Advanced message formatting
- [ ] Custom themes
- [ ] Message reactions

### Known Issues
- Large conversation history may impact AI response time
- iOS keyboard handling in landscape mode needs improvement
- Android back button behavior inconsistent in some screens

## Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join our GitHub Discussions for feature requests
- **Community**: Connect with other users and contributors

## Changelog

### Version 1.0.0
- Initial release
- Basic messaging functionality
- Multiple AI service integration
- Local storage implementation
- Material Design UI
- Export/import functionality
- Settings and customization options

---

**Happy messaging with AI! 🤖💬**