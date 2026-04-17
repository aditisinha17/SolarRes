import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';

// Store drawn polygon data globally for form screen
export let drawnRoofData: { area: number; latitude: number; longitude: number } | null = null;

export default function MapScreen() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  // Listen for messages from the CesiumJS iframe (web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        switch (data.type) {
          case 'VIEWER_READY':
            setReady(true);
            break;

          case 'POLYGON_DRAWN':
            drawnRoofData = {
              area: data.area,
              latitude: data.latitude,
              longitude: data.longitude,
            };
            router.push({
              pathname: '/form',
              params: {
                area: data.area.toFixed(1),
                lat: data.latitude.toFixed(6),
                lng: data.longitude.toFixed(6),
              },
            });
            break;

          case 'ADDRESS_SELECTED':
            break;
        }
      } catch (e) {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  // React Native (native) handler for WebView messages
  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'VIEWER_READY':
          setReady(true);
          break;

        case 'POLYGON_DRAWN':
          drawnRoofData = {
            area: data.area,
            latitude: data.latitude,
            longitude: data.longitude,
          };
          router.push({
            pathname: '/form',
            params: {
              area: data.area.toFixed(1),
              lat: data.latitude.toFixed(6),
              lng: data.longitude.toFixed(6),
            },
          });
          break;

        case 'ADDRESS_SELECTED':
          break;
      }
    } catch (e) {
      console.error('WebView message parse error:', e);
    }
  }, [router]);

  // Web: use iframe to load CesiumJS map
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          ref={iframeRef as any}
          src="http://localhost:5029/cesium-map.html"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          } as any}
          allow="geolocation"
        />
        {!ready && (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>☀️ Loading 3D Globe...</Text>
          </View>
        )}
      </View>
    );
  }

  // Native: use WebView
  const WebView = require('react-native-webview').WebView;
  const mapHtml = require('../assets/cesium-map.html');

  return (
    <View style={styles.container}>
      <WebView
        source={mapHtml}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
        onError={(e: any) => console.error('WebView error:', e.nativeEvent)}
      />
      {!ready && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>☀️ Loading 3D Globe...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgPrimary },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.bgPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: theme.colors.textSecondary, fontSize: 16 },
});
