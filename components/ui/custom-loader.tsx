import React, { useEffect, useRef } from 'react';
import { Animated, View, Image, StyleSheet } from 'react-native';

interface CustomLoaderProps {
  size?: number;
}

export default function CustomLoader({ size = 120 }: CustomLoaderProps) {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // 1. Buat animasi sequence-nya
    const pulseAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // 2. Bungkus dengan loop dan simpan ke variabel
    const loopAnimation = Animated.loop(pulseAnimation);

    // 3. Jalankan animasinya
    loopAnimation.start();

    // 4. Cleanup: Hentikan animasi saat komponen di-unmount agar tidakmemory leak
    return () => {
      loopAnimation.stop();
    };
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }}
      >
        <Image
          source={require('../../assets/images/android-icon-foreground.png')}
          style={{ width: size, height: size, resizeMode: 'contain' }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
