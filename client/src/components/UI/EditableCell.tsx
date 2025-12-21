import { useState, useEffect, useRef } from 'react';

interface EditableCellProps {
    value: string | number | null | undefined;
    onSave: (value: string | number) => Promise<void>;
    type?: 'text' | 'number' | 'date';
    className?: string;
    formatDisplay?: (value: string | number) => string;
    parseValue?: (value: string) => string | number;
}

export const EditableCell: React.FC<EditableCellProps> = ({
    value,
    onSave,
    type = 'text',
    className = '',
    formatDisplay,
    parseValue,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const startEditing = () => {
        if (!isEditing) {
            const initialValue = value ?? '';
            if (type === 'date' && initialValue) {
                setEditValue(new Date(initialValue as string).toISOString().split('T')[0]);
            } else if (type === 'number' && formatDisplay) {
                // For numbers with formatting, extract the raw number
                const numValue = typeof initialValue === 'number' ? initialValue : parseFloat(String(initialValue)) || 0;
                setEditValue(String(numValue));
            } else {
                setEditValue(String(initialValue));
            }
            setIsEditing(true);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent cell selection
        startEditing();
    };

    const handleBlur = async () => {
        if (!isEditing) return;

        try {
            let finalValue: string | number;
            if (parseValue) {
                finalValue = parseValue(editValue);
            } else if (type === 'number') {
                // Remove currency symbols and formatting
                const cleaned = editValue.replace(/[AED,\s]/g, '');
                finalValue = parseFloat(cleaned) || 0;
            } else {
                finalValue = editValue;
            }
            await onSave(finalValue);
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            // Always reset editing state, even if there's an error
            setIsEditing(false);
            setEditValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setIsEditing(false);
            setEditValue(String(value ?? ''));
        } else if (type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.key === 'ArrowUp' ? 1 : -1;
            handleNumberChange(delta);
        }
    };

    const handleNumberChange = (delta: number) => {
        if (type !== 'number') return;

        const currentValue = parseFloat(editValue) || 0;
        const step = 0.01; // Default step for currency amounts
        const newValue = currentValue + (delta * step);
        const roundedValue = Math.round(newValue * 100) / 100; // Round to 2 decimal places
        setEditValue(String(roundedValue >= 0 ? roundedValue : 0)); // Prevent negative values if needed
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
        if (type !== 'number' || !isEditing) return;

        e.preventDefault();
        e.stopPropagation();

        // Determine direction: negative deltaY means scrolling up (increase), positive means down (decrease)
        const delta = e.deltaY < 0 ? 1 : -1;
        handleNumberChange(delta);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
                className={`px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
                style={{
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}
                step={type === 'number' ? '0.01' : undefined}
            />
        );
    }

    const displayValue = formatDisplay
        ? formatDisplay(value ?? '')
        : (value ?? '-');

    return (
        <div
            onDoubleClick={handleDoubleClick}
            onClick={(e) => {
                // Don't stop propagation - let single clicks bubble up to td for cell selection
                // Only double-click will trigger editing
            }}
            className={`absolute inset-0 cursor-cell transition-colors flex items-center justify-start px-3 py-2 group ${className}`}
            title="Double-click to edit"
            style={{
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => {
                const parentTd = (e.currentTarget as HTMLElement).closest('td');
                if (parentTd) {
                    const computedStyle = window.getComputedStyle(parentTd);
                    const outline = computedStyle.outline;

                    // Check if cell is selected (has gold outline)
                    const isSelected = outline && outline !== 'none' && outline.includes('rgb(218, 165, 32)');

                    // Only apply hover background if cell is not selected
                    // Use a lighter hover effect that won't conflict with selection
                    if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                    }
                }
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '';
            }}
        >
            {displayValue}
        </div >
    );
};
