import React, { useRef, memo } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { LAYOUT, COLORS } from '../styles/InnerRoomScreen.styles';

const DraggablePip = ({ children }) => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        // Boundary checks could be added here
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
        position: 'absolute',
        bottom: 150,
        right: 20,
        width: LAYOUT.pipWidth,
        height: LAYOUT.pipHeight,
        zIndex: 100,
        elevation: 5,
        borderRadius: 15,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.primary.main,
        backgroundColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
};

export default memo(DraggablePip);
