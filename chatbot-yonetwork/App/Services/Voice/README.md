# Assistant Vocal Conversationnel

Un assistant vocal fluide et naturel pour votre chatbot, utilisant des APIs gratuites performantes.

## 🎯 Fonctionnalités

- **Reconnaissance vocale** (Speech-to-Text) : Conversion précise de la voix en texte
- **Synthèse vocale** (Text-to-Speech) : Voix naturelles et fluides
- **Mode conversation** : Interaction continue sans appuyer sur des boutons
- **Commandes vocales** : Contrôlez l'application avec votre voix
- **Support multilingue** : 10+ langues supportées
- **Optimisation des performances** : Cache audio intelligent
- **Interface intuitive** : Indicateurs visuels et animations fluides

## 🚀 Installation

Les dépendances nécessaires sont déjà ajoutées au projet :
- `react-native-voice` : Pour la reconnaissance vocale sur mobile
- `react-native-tts` : Pour la synthèse vocale sur mobile
- Web Speech API : Utilisée automatiquement sur navigateur

## 💡 Utilisation

### Import basique

```javascript
import VoiceAssistantService from '../Services/Voice/VoiceAssistantService';
import { VoiceButton, VoiceIndicator, VoiceSettings } from '../components/Voice';
```

### Initialisation

```javascript
// Dans votre composant
useEffect(() => {
    const initVoice = async () => {
        await VoiceAssistantService.initialize();
        
        // Configurer les callbacks
        VoiceAssistantService.setCallbacks({
            onSpeechResults: (e) => {
                console.log('Transcription:', e.value[0]);
            }
        });
    };
    
    initVoice();
}, []);
```

### Démarrer l'écoute

```javascript
const startListening = async () => {
    try {
        await VoiceAssistantService.startListening();
    } catch (error) {
        console.error('Erreur:', error);
    }
};
```

### Faire parler l'assistant

```javascript
VoiceAssistantService.speak('Bonjour, comment puis-je vous aider ?');
```

## 🎤 Commandes Vocales

L'assistant reconnaît plusieurs commandes :

- **"Stop"** / **"Arrête"** : Arrête l'écoute
- **"Mode conversation"** : Active l'écoute continue
- **"Stop conversation"** : Désactive l'écoute continue
- **"Nouvelle conversation"** : Efface le chat actuel
- **"Retour"** : Revient à l'écran précédent
- **"Accueil"** : Retourne à l'écran d'accueil
- **"Plus vite"** / **"Plus lent"** : Ajuste la vitesse de parole
- **"Plus fort"** / **"Moins fort"** : Ajuste le volume

## ⚙️ Configuration

Modifiez les paramètres dans `VoiceConfig.js` :

```javascript
export const VoiceConfig = {
    DEFAULT_LANGUAGE: 'fr-FR',
    DEFAULT_SPEECH_RATE: 1.0,
    DEFAULT_PITCH: 1.0,
    // ... autres paramètres
};
```

## 🧩 Composants

### VoiceButton
Bouton animé pour activer/désactiver l'écoute vocale.

```jsx
<VoiceButton
    onPress={toggleListening}
    isListening={isListening}
    isSpeaking={isSpeaking}
    size={60}
/>
```

### VoiceIndicator
Affiche la transcription en temps réel et l'état de l'assistant.

```jsx
<VoiceIndicator
    isListening={isListening}
    isSpeaking={isSpeaking}
    transcript={transcript}
    partialTranscript={partialTranscript}
    error={error}
/>
```

### VoiceSettings
Modal pour configurer les paramètres vocaux.

```jsx
<VoiceSettings
    visible={showSettings}
    onClose={() => setShowSettings(false)}
/>
```

## 🎨 Personnalisation

### Ajouter une commande vocale

```javascript
VoiceCommandProcessor.registerCommand('MA_COMMANDE', (context) => {
    return {
        action: 'monAction',
        message: 'Commande exécutée'
    };
});
```

### Changer la voix

```javascript
// Changer la langue
await VoiceAssistantService.setLanguage('en-US');

// Ajuster la vitesse
await VoiceAssistantService.setSpeechRate(1.2);

// Modifier le ton
await VoiceAssistantService.setPitch(0.9);
```

## 🔧 Architecture

```
Voice/
├── VoiceAssistantService.js    # Service principal
├── VoiceWebService.js          # Implémentation Web Speech API
├── VoiceCommandProcessor.js    # Traitement des commandes
├── AudioCache.js               # Cache pour optimiser les performances
├── VoiceConfig.js              # Configuration centralisée
└── README.md                   # Cette documentation

components/Voice/
├── VoiceButton.js              # Bouton vocal animé
├── VoiceIndicator.js           # Indicateur de transcription
└── VoiceSettings.js            # Paramètres vocaux
```

## 📱 Compatibilité

- **iOS** : iOS 10.0+
- **Android** : Android 5.0+
- **Web** : Chrome, Edge, Safari (avec Web Speech API)

## 🐛 Résolution des problèmes

### Le microphone ne fonctionne pas
1. Vérifiez les permissions dans les paramètres de l'application
2. Sur web, assurez-vous d'utiliser HTTPS
3. Redémarrez l'application

### La synthèse vocale est muette
1. Vérifiez le volume du dispositif
2. Assurez-vous qu'une langue est installée
3. Testez avec le bouton "Tester la voix" dans les paramètres

### Performances lentes
1. Activez le cache dans les paramètres
2. Réduisez la qualité audio si nécessaire
3. Limitez la longueur des textes à synthétiser

## 📚 Ressources

- [Web Speech API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [react-native-voice](https://github.com/react-native-voice/voice)
- [react-native-tts](https://github.com/ak1394/react-native-tts) 