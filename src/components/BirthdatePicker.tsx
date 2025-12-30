import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface BirthdatePickerProps {
  value: { day: number; month: number; year: number } | null;
  onChange: (value: { day: number; month: number; year: number }) => void;
}

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelColumnProps {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const WheelColumn = ({ items, selectedIndex, onSelect }: WheelColumnProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (containerRef.current) {
      const scrollTop = index * ITEM_HEIGHT;
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  useEffect(() => {
    if (!isScrollingRef.current) {
      scrollToIndex(selectedIndex, false);
    }
  }, [selectedIndex, scrollToIndex]);

  const handleScroll = () => {
    isScrollingRef.current = true;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));
        
        scrollToIndex(clampedIndex, true);
        
        if (clampedIndex !== selectedIndex) {
          onSelect(clampedIndex);
        }
        
        isScrollingRef.current = false;
      }
    }, 100);
  };

  return (
    <div className="relative flex-1" style={{ height: PICKER_HEIGHT }}>
      {/* Fade gradients */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
      
      {/* Selection indicator */}
      <div 
        className="absolute inset-x-0 z-0 border-y border-border bg-secondary/30"
        style={{ 
          top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          height: ITEM_HEIGHT 
        }}
      />
      
      {/* Scrollable list */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{ 
          paddingTop: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          paddingBottom: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
      >
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className={cn(
              "h-11 flex items-center justify-center font-serif text-lg snap-center transition-all duration-150",
              index === selectedIndex 
                ? "text-foreground font-semibold scale-105" 
                : "text-muted-foreground/60"
            )}
            onClick={() => {
              onSelect(index);
              scrollToIndex(index, true);
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

const BirthdatePicker = ({ value, onChange }: BirthdatePickerProps) => {
  const dayIndex = value ? value.day - 1 : 14;
  const monthIndex = value ? value.month - 1 : 5;
  const yearIndex = value ? years.indexOf(value.year) : 21;

  const handleDayChange = (index: number) => {
    onChange({
      day: days[index],
      month: value?.month || monthIndex + 1,
      year: value?.year || years[yearIndex]
    });
  };

  const handleMonthChange = (index: number) => {
    onChange({
      day: value?.day || days[dayIndex],
      month: index + 1,
      year: value?.year || years[yearIndex]
    });
  };

  const handleYearChange = (index: number) => {
    onChange({
      day: value?.day || days[dayIndex],
      month: value?.month || monthIndex + 1,
      year: years[index]
    });
  };

  return (
    <div className="flex gap-2 w-full max-w-sm mx-auto">
      <WheelColumn
        items={days}
        selectedIndex={dayIndex}
        onSelect={handleDayChange}
      />
      <WheelColumn
        items={months}
        selectedIndex={monthIndex}
        onSelect={handleMonthChange}
      />
      <WheelColumn
        items={years}
        selectedIndex={yearIndex >= 0 ? yearIndex : 21}
        onSelect={handleYearChange}
      />
    </div>
  );
};

export default BirthdatePicker;
