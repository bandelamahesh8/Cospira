import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, StatusBar } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const LoadingSimulation = ({ message = 'INITIALIZING...', meta = 'ESTABLISHING LINK...' }) => {
    const { colors, isDark } = useTheme();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05, // Subtle pulse
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotation animation
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Progress bar simulation
        Animated.loop(
            Animated.sequence([
                Animated.timing(progressAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: false, // width doesn't support native driver
                }),
                Animated.timing(progressAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: false,
                })
            ])
        ).start();
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <View style={styles.loadingInner}>
                <Animated.View style={[styles.loadingLogoContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="aperture-outline" size={80} color={colors.primary} />
                    </Animated.View>
                    <View style={[styles.loadingLogoOverlay, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                        <Ionicons name="flash" size={30} color="#ffffff" />
                    </View>
                </Animated.View>

                <Text style={[styles.loadingText, { color: colors.text }]}>{message}</Text>
                
                <View style={[styles.loadingProgressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <Animated.View style={[styles.loadingProgressBar, { width: progressWidth, backgroundColor: colors.primary }]} />
                </View>
                
                <Text style={[styles.loadingMeta, { color: colors.textSecondary }]}>{meta}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 9999,
    },
    loadingInner: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 40,
    },
    loadingLogoContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    loadingLogoOverlay: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#8b5cf6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 8,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 20,
        textAlign: 'center',
    },
    loadingProgressContainer: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 12,
    },
    loadingProgressBar: {
        height: '100%',
        backgroundColor: '#8b5cf6',
        borderRadius: 2,
    },
    loadingMeta: {
        fontSize: 11,
        fontWeight: '400',
        letterSpacing: 0.2,
    }
});

export default LoadingSimulation;
