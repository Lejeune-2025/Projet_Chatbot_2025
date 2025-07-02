# Corrections pour la compatibilité web du chatbot

Ce document explique les modifications apportées pour résoudre les problèmes de compatibilité web de l'application React Native.

## Problèmes résolus

1. **Erreur "Unexpected text node"** - Corrigé en modifiant le composant MessageBubble pour utiliser un composant Text vide avec un espace et en supprimant les espaces entre les balises View dans Sidebar.js.

2. **Avertissement "useNativeDriver is not supported"** - Corrigé en désactivant useNativeDriver sur la plateforme web dans tous les fichiers d'animation:
   - AnimationService.js
   - NotificationContext.js
   - ThemeToggle.js
   - ThemeToggleButton.js
   - ChatScreen.js

3. **Avertissement "style.resizeMode is deprecated"** - Créé un composant WebCompatibleImage qui gère correctement resizeMode comme prop au lieu de style.

4. **Avertissement "TouchableWithoutFeedback is deprecated"** - Créé un composant PressableCompatibility qui utilise Pressable sur le web et TouchableWithoutFeedback sur mobile.

5. **Avertissement "props.pointerEvents is deprecated"** - Géré dans le composant PressableCompatibility pour déplacer pointerEvents dans l'objet style sur le web.

6. **Problème d'envoi d'image en double** - Corrigé en modifiant la fonction onSend dans ChatScreen.js pour extraire uniquement le texte du message lors de l'envoi au serveur, sans inclure l'image dans la requête API. L'image est uniquement affichée dans l'interface utilisateur via le composant GiftedChat.

## Nouveaux composants

### WebCompatibilityFixes

Ce composant supprime les avertissements de dépréciation dans la console pour améliorer l'expérience utilisateur. Il est importé dans App.js.

### PressableCompatibility

Composant qui remplace TouchableWithoutFeedback par Pressable sur le web tout en maintenant la compatibilité avec les anciennes versions de React Native sur mobile.

### WebCompatibleImage

Composant Image qui gère correctement resizeMode comme prop au lieu de style sur le web.

## Comment utiliser ces composants

1. **WebCompatibilityFixes** est déjà importé dans App.js et ne nécessite aucune modification supplémentaire.

2. Pour utiliser **PressableCompatibility**, remplacez:
   ```jsx
   import { TouchableWithoutFeedback } from 'react-native';
   // ...
   <TouchableWithoutFeedback onPress={...}>
     {/* contenu */}
   </TouchableWithoutFeedback>
   ```
   
   Par:
   ```jsx
   import PressableCompatibility from '../components/PressableCompatibility';
   // ...
   <PressableCompatibility onPress={...}>
     {/* contenu */}
   </PressableCompatibility>
   ```

3. Pour utiliser **WebCompatibleImage**, remplacez:
   ```jsx
   import { Image } from 'react-native';
   // ...
   <Image 
     source={...} 
     style={{ width: 100, height: 100, resizeMode: 'cover' }}
   />
   ```
   
   Par:
   ```jsx
   import WebCompatibleImage from '../components/WebCompatibleImage';
   // ...
   <WebCompatibleImage 
     source={...} 
     style={{ width: 100, height: 100 }}
     resizeMode="cover"
   />
   ```

## Remarques supplémentaires

Ces modifications permettent à l'application de fonctionner correctement à la fois sur mobile et sur le web sans afficher d'erreurs ou d'avertissements dans la console.

Si vous rencontrez d'autres problèmes de compatibilité web, vous pouvez étendre le composant WebCompatibilityFixes pour filtrer d'autres avertissements ou créer des composants compatibles supplémentaires. 