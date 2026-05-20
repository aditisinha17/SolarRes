import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/theme';

// Store drawn polygon data globally for form screen
export let drawnRoofData: { area: number; latitude: number; longitude: number } | null = null;

export default function MapScreen() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  
  // Onboarding Guide State
  const [showGuide, setShowGuide] = useState(true);
  const [guideStep, setGuideStep] = useState(0);

  const guideSteps = [
    { title: 'Step 1: Find Your Home', text: 'Use the search box at the top to type in your address and fly to your location.', icon: 'search' },
    { title: 'Step 2: Draw Your Roof', text: 'Click the "✏️ Draw Roof" button, then click the corners of your roof to draw a polygon.', icon: 'create' },
    { title: 'Step 3: See Your Solar Power', text: 'Click the "✅ Finish" button (or right-click) to instantly calculate how much solar energy you can generate!', icon: 'flash' },
  ];

  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    })
  ).current;

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
        {ready && showGuide && (
          <Animated.View 
            style={[styles.guideContainer, { transform: pan.getTranslateTransform() }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.guideHeader}>
              <Ionicons name={guideSteps[guideStep].icon as any} size={20} color={theme.colors.accentOrange} />
              <Text style={styles.guideTitle}>{guideSteps[guideStep].title}</Text>
              <TouchableOpacity onPress={() => setShowGuide(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.guideText}>{guideSteps[guideStep].text}</Text>
            <View style={styles.guideFooter}>
              <Text style={styles.guideProgress}>{guideStep + 1} of 3</Text>
              <View style={styles.guideButtons}>
                {guideStep > 0 && (
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => setGuideStep(s => s - 1)}>
                    <Text style={styles.btnTextSec}>Back</Text>
                  </TouchableOpacity>
                )}
                {guideStep < 2 ? (
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => setGuideStep(s => s + 1)}>
                    <Text style={styles.btnTextPri}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowGuide(false)}>
                    <Text style={styles.btnTextPri}>Got it!</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>
        )}
        {ready && !showGuide && (
          <TouchableOpacity style={styles.helpButton} onPress={() => setShowGuide(true)}>
            <Ionicons name="help-circle" size={28} color="#fff" />
          </TouchableOpacity>
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
      {ready && showGuide && (
        <Animated.View 
          style={[styles.guideContainer, { transform: pan.getTranslateTransform() }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.guideHeader}>
            <Ionicons name={guideSteps[guideStep].icon as any} size={20} color={theme.colors.accentOrange} />
            <Text style={styles.guideTitle}>{guideSteps[guideStep].title}</Text>
            <TouchableOpacity onPress={() => setShowGuide(false)}>
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.guideText}>{guideSteps[guideStep].text}</Text>
          <View style={styles.guideFooter}>
            <Text style={styles.guideProgress}>{guideStep + 1} of 3</Text>
            <View style={styles.guideButtons}>
              {guideStep > 0 && (
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setGuideStep(s => s - 1)}>
                  <Text style={styles.btnTextSec}>Back</Text>
                </TouchableOpacity>
              )}
              {guideStep < 2 ? (
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setGuideStep(s => s + 1)}>
                  <Text style={styles.btnTextPri}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowGuide(false)}>
                  <Text style={styles.btnTextPri}>Got it!</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      )}
      {ready && !showGuide && (
        <TouchableOpacity style={styles.helpButton} onPress={() => setShowGuide(true)}>
          <Ionicons name="help-circle" size={28} color="#fff" />
        </TouchableOpacity>
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
  
  guideContainer: {
    position: 'absolute', bottom: 30, left: 20, right: 20, maxWidth: 400, alignSelf: 'center',
    backgroundColor: theme.colors.bgCard, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: theme.colors.accentOrange + '50',
    ...theme.shadows.glow,
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  guideTitle: { flex: 1, color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', marginLeft: 8 },
  guideText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 20 },
  guideFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guideProgress: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  guideButtons: { flexDirection: 'row', gap: 10 },
  btnSecondary: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.bgGlass, borderWidth: 1, borderColor: theme.colors.borderLight },
  btnTextSec: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.accentOrange },
  btnTextPri: { color: '#fff', fontSize: 14, fontWeight: '600' },

  helpButton: {
    position: 'absolute', bottom: 30, right: 20, width: 50, height: 50,
    backgroundColor: theme.colors.accentOrange, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.glow,
  },
});
