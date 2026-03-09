import { useContext } from 'react';
import BreakoutContext from './BreakoutContext';

export const useBreakout = () => {
  const context = useContext(BreakoutContext);
  if (context === undefined) {
    throw new Error('useBreakout must be used within a BreakoutProvider');
  }
  return context;
};
