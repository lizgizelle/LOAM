import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { countryCodes, CountryCode, defaultCountry } from '@/lib/countryCodes';
import { cn } from '@/lib/utils';

interface CountryCodeSelectProps {
  value: CountryCode;
  onChange: (country: CountryCode) => void;
}

const CountryCodeSelect = ({ value, onChange }: CountryCodeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCountries = countryCodes.filter(country => 
    country.name.toLowerCase().includes(search.toLowerCase()) ||
    country.code.includes(search)
  );

  const handleSelect = (country: CountryCode) => {
    onChange(country);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-14 px-4 rounded-xl border-2 border-border bg-popover text-foreground font-medium hover:bg-secondary/50 transition-colors"
      >
        <span className="text-lg">{value.flag}</span>
        <span>{value.code}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 max-h-80 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-secondary/50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Country list */}
          <div className="max-h-56 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={`${country.code}-${country.name}`}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors",
                    value.code === country.code && value.name === country.name && "bg-secondary"
                  )}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1 text-foreground">{country.name}</span>
                  <span className="text-muted-foreground text-sm">{country.code}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelect;
