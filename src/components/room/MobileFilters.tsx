import { motion } from 'framer-motion';

const CATEGORIES = ['All', 'AI', 'Gaming', 'Dev', 'Private', 'Live'];

interface MobileFiltersProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export const MobileFilters = ({ activeCategory, onCategoryChange }: MobileFiltersProps) => {
  return (
    <div className='flex items-center gap-3 overflow-x-auto px-6 py-2 no-scrollbar'>
      {CATEGORIES.map((category) => {
        const isActive = activeCategory.toLowerCase() === category.toLowerCase();

        return (
          <motion.button
            key={category}
            onClick={() => onCategoryChange(category)}
            whileTap={{ scale: 0.95 }}
            className={`relative px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              isActive ? 'text-white border-transparent' : 'text-white/40 border-white/5 bg-white/5'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId='activeCategoryBg'
                className='absolute inset-0 bg-white rounded-full'
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className='relative z-10'>{category}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
