import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../pages/HomeScreen';
import React, { useEffect, useState } from 'react';
import ChatScreen from '../pages/ChatScreen';
import LoginScreen from '../pages/LoginScreen';
import RegisterScreen from '../pages/RegisterScreen';
import VerifyEmailScreen from '../pages/VerifyEmailScreen';
import AuthScreen from '../pages/AuthScreen';
import { logger } from '../Services/logger';
import withTheme from '../components/withTheme';

// Appliquer le HOC withTheme à tous les écrans
const ThemedHomeScreen = withTheme(HomeScreen);
const ThemedChatScreen = withTheme(ChatScreen);
const ThemedLoginScreen = withTheme(LoginScreen);
const ThemedRegisterScreen = withTheme(RegisterScreen);
const ThemedVerifyEmailScreen = withTheme(VerifyEmailScreen);
const ThemedAuthScreen = withTheme(AuthScreen);

const Stack = createNativeStackNavigator();

export default function HomeScreenNavigation({ initialAuthenticated = false }) {
    const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
    
    useEffect(() => {
        logger.info(`État d'authentification initial: ${initialAuthenticated}`);
        setIsAuthenticated(initialAuthenticated);
    }, [initialAuthenticated]);
    
    return (
        <Stack.Navigator 
            initialRouteName={isAuthenticated ? "Chat" : "Home"}
            screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
            }}
        >
            <Stack.Screen 
                name="Home" 
                component={ThemedHomeScreen}
                options={{
                    gestureEnabled: false
                }}
            />
            <Stack.Screen 
                name="Login" 
                component={ThemedLoginScreen}
                options={{
                    gestureEnabled: true
                }}
            />
            <Stack.Screen 
                name="Auth" 
                component={ThemedAuthScreen}
                options={{
                    gestureEnabled: true
                }}
            />
            <Stack.Screen 
                name="Register" 
                component={ThemedRegisterScreen}
                options={{
                    gestureEnabled: true
                }}
            />
            <Stack.Screen 
                name="Chat" 
                component={ThemedChatScreen}
                options={{
                    gestureEnabled: true
                }}
            />
            <Stack.Screen 
                name="VerifyEmail" 
                component={ThemedVerifyEmailScreen}
                options={{
                    gestureEnabled: false,
                    animation: 'fade'
                }}
            />
        </Stack.Navigator>
    );
}