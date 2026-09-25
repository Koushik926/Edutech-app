import React, { useRef, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';

const CONTENT_ORIGIN = 'https://rutikakhedkar.github.io';

export default function CourseWebViewScreen() {
  const params = useLocalSearchParams<{
    title: string;
    instructor: string;
    price: string;
    description: string;
  }>();

  const courseUrl = `${CONTENT_ORIGIN}/webview/?course=${encodeURIComponent(
    params.title || ''
  )}&instructor=${encodeURIComponent(
    params.instructor || ''
  )}&price=${encodeURIComponent(
    params.price || ''
  )}&description=${encodeURIComponent(
    params.description || ''
  )}`;

  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'START_LEARNING') {
        console.log('User started learning');
      }
    } catch (err) {
      console.log(err);
    }
  };

  const retry = () => {
    setError(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-6">
        <Text className="text-error text-sm text-center mb-4">
          Failed to load course content. Check your connection and try again.
        </Text>
        <TouchableOpacity className="bg-primary rounded-lg px-5 py-2.5" onPress={retry}>
          <Text className="text-white font-bold text-sm">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* The page is a third-party static site: the user's access token and
          email are deliberately NOT sent to it (they were previously leaked
          as request headers without being usable by the page). */}
      <WebView
        ref={webViewRef}
        source={{ uri: courseUrl, headers: { Platform: 'Expo-App' } }}
        originWhitelist={[CONTENT_ORIGIN]}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        onHttpError={() => {
          setLoading(false);
          setError(true);
        }}
      />
      {loading && (
        <View className="absolute inset-0 justify-center items-center bg-background/80">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </View>
  );
}
