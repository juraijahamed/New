import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    suggestions: string[];
    placeholder?: string;
    required?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
    value,
    onChange,
    suggestions,
    placeholder = '',
    required = false,
    className = '',
    style = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter suggestions based on input value
    const filteredSuggestions = suggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        if (style.borderColor) {
            e.target.style.borderColor = '#DAA520';
        }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (style.borderColor) {
            e.target.style.borderColor = '#e8ddd0';
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        onChange(suggestion);
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || filteredSuggestions.length === 0) {
            if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredSuggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                    handleSuggestionClick(filteredSuggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const defaultStyle = {
        border: '2px solid #e8ddd0',
        background: '#fdf9f3',
        color: '#5D4037',
        ...style
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                required={required}
                className={`w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${className}`}
                style={defaultStyle}
                autoComplete="off"
            />

            {isOpen && value && filteredSuggestions.length > 0 && (
                <div
                    className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl max-h-60 overflow-y-auto"
                    style={{
                        borderColor: '#DAA520',
                        border: '2px solid #DAA520',
                        boxShadow: '0 20px 25px -5px rgba(218, 165, 32, 0.2), 0 10px 10px -5px rgba(218, 165, 32, 0.1)'
                    }}
                >
                    {filteredSuggestions.map((suggestion, index) => {
                        const matchIndex = suggestion.toLowerCase().indexOf(value.toLowerCase());
                        const beforeMatch = suggestion.slice(0, matchIndex);
                        const match = suggestion.slice(matchIndex, matchIndex + value.length);
                        const afterMatch = suggestion.slice(matchIndex + value.length);

                        return (
                            <div
                                key={suggestion}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className={`px-4 py-3 cursor-pointer transition-all text-sm ${index === highlightedIndex
                                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50'
                                    : 'hover:bg-gray-50'
                                    }`}
                                style={{
                                    color: '#5D4037',
                                    borderLeft: index === highlightedIndex ? '3px solid #DAA520' : '3px solid transparent'
                                }}
                            >
                                {matchIndex >= 0 ? (
                                    <>
                                        {beforeMatch}
                                        <span className="font-bold" style={{ color: '#DAA520' }}>
                                            {match}
                                        </span>
                                        {afterMatch}
                                    </>
                                ) : (
                                    suggestion
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AutocompleteInput;
