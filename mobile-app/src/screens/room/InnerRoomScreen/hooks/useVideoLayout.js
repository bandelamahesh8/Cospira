import { useState, useCallback } from 'react';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const useVideoLayout = () => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  });

  const calculateGridLayout = useCallback(
    (participantCount) => {
      if (participantCount === 0) {
        return { cols: 1, rows: 1, tileWidth: 0, tileHeight: 0 };
      }

      let cols = 1;
      let rows = 1;

      if (participantCount === 1) {
        cols = 1;
        rows = 1;
      } else if (participantCount === 2) {
        cols = 1;
        rows = 2;
      } else if (participantCount <= 4) {
        cols = 2;
        rows = 2;
      } else if (participantCount <= 6) {
        cols = 2;
        rows = 3;
      } else {
        cols = 3;
        rows = 3;
      }

      const tileWidth = containerDimensions.width / cols;
      const tileHeight = containerDimensions.height / rows;

      return { cols, rows, tileWidth, tileHeight };
    },
    [containerDimensions]
  );

  return {
    containerDimensions,
    setContainerDimensions,
    calculateGridLayout,
  };
};
