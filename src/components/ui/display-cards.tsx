import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  titleClassName?: string;
  image?: string;
  features?: string[];
  onClick?: () => void;
  style?: React.CSSProperties;
  x?: number;
  y?: number;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  titleClassName = "text-blue-500",
  image,
  features = [],
  onClick,
  style,
  x = 0,
  y = 0,
}: DisplayCardProps) {
  return (
    <motion.div
      onClick={onClick}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: style?.opacity ?? 1,
        y: y,
        x: x,
        rotateY: -15,
        rotateX: 5,
        skewY: -6,
      }}
      whileHover={{ 
        y: y - 40,
        x: x,
        scale: 1.05, 
        skewY: 0,
        rotateY: 0,
        rotateX: 0,
        zIndex: 100,
        transition: { duration: 0.4 }
      }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        opacity: { duration: 0.5 }
      }}
      className={cn(
        "absolute flex h-80 w-[32rem] select-none flex-col justify-between rounded-[2.5rem] border border-white/10 bg-[#0a0c10]/95 backdrop-blur-2xl px-12 py-10 overflow-hidden group/card cursor-pointer",
        "hover:border-white/30 hover:bg-[#0a0c10]/98",
        className
      )}
    >
      {image && (
        <div className="absolute inset-0 z-0">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover opacity-20 grayscale group-hover/card:grayscale-0 group-hover/card:opacity-40 transition-all duration-700 scale-110 group-hover/card:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-[#030407]/80 to-transparent" />
        </div>
      )}

      <div className="relative z-10 flex items-center gap-6">
        <span className="relative inline-flex items-center justify-center rounded-2xl bg-white/5 p-4 border border-white/10 group-hover/card:border-white/30 transition-colors">
          {icon}
        </span>
        <div className="space-y-1">
          <p className={cn("text-3xl font-black italic uppercase tracking-tighter text-white", titleClassName)}>{title}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">{date}</p>
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        <div className="space-y-2">
          <p className="text-2xl font-bold text-white leading-tight">{description}</p>
          <div className="h-1 w-12 bg-white/10 group-hover/card:w-24 group-hover/card:bg-white/40 transition-all duration-700" />
        </div>
        
        {/* Features revealed on hover */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 opacity-0 group-hover/card:opacity-100 translate-y-10 group-hover/card:translate-y-0 transition-all duration-700 delay-100">
           {features.map((feat, i) => (
             <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">{feat}</span>
             </div>
           ))}
        </div>
      </div>
    </motion.div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
  onCardClick?: (index: number) => void;
}

export default function DisplayCards({ cards, onCardClick }: DisplayCardsProps) {
  const defaultCards = [
    {
      className: "hover:-translate-y-10",
    },
    {
      className: "translate-x-16 translate-y-10 hover:-translate-y-1",
    },
    {
      className: "translate-x-32 translate-y-20",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
      <AnimatePresence mode="popLayout">
        {displayCards.map((cardProps, index) => (
          <DisplayCard 
            key={(cardProps as any).id || index} 
            {...cardProps} 
            onClick={() => onCardClick?.(index)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}


