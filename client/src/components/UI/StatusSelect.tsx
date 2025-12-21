import React from 'react';

type Status = 'pending' | 'credited' | 'transferred' | 'canceled' | 'cleared' | 'on-hold' | '' | string;

interface StatusSelectProps {
    value: Status;
    onChange: (newStatus: string) => void;
    className?: string;
}

const defaultStatusColors: Record<string, { bg: string; text: string; border: string }> = {
    'pending': { bg: '#FF9800', text: '#FFFFFF', border: '#F57C00' },
    'credited': { bg: '#4CAF50', text: '#FFFFFF', border: '#388E3C' },
    'transferred': { bg: '#2196F3', text: '#FFFFFF', border: '#1976D2' },
    'canceled': { bg: '#F44336', text: '#FFFFFF', border: '#D32F2F' },
    'cleared': { bg: '#FFD700', text: '#000000', border: '#FFA000' },
    'on-hold': { bg: '#795548', text: '#FFFFFF', border: '#5D4037' },
    'default': { bg: '#FFFFFF', text: '#374151', border: '#D1D5DB' }
};

// Helper function to determine text color based on background
const getTextColor = (bgColor: string): string => {
    if (!bgColor) return '#374151';
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000000' : '#FFFFFF';
};

// Helper function to darken color for border
const darkenColor = (color: string, amount: number = 0.2): string => {
    if (!color) return '#D1D5DB';
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * amount));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * amount));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, className }) => {
    const currentStatus = value === 'draft' ? '' : (value || '');
    const styles = defaultStatusColors[currentStatus] || defaultStatusColors['default'];
    const availableStatuses = Object.keys(defaultStatusColors).filter(k => k !== 'default');

    return (
        <select
            value={currentStatus}
            onChange={(e) => onChange(e.target.value)}
            className={`text-xs font-bold rounded px-1.5 py-1 border shadow-sm transition-all cursor-cell focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50 ${className}`}
            style={{
                width: '100%',
                maxWidth: '100%',
                backgroundColor: styles.bg,
                color: styles.text,
                borderColor: styles.border,
            }}
            onClick={(e) => e.stopPropagation()} // Prevent row click
        >
            <option value="" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>Select Status</option>
            {availableStatuses.map((status) => {
                const statusStyles = defaultStatusColors[status];
                const displayName = status
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                return (
                    <option
                        key={status}
                        value={status}
                        style={{
                            backgroundColor: statusStyles.bg,
                            color: statusStyles.text
                        }}
                    >
                        {displayName}
                    </option>
                );
            })}
        </select>
    );
};
