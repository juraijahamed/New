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



export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, className }) => {
    const currentStatus = value === 'draft' ? '' : (value || '');
    const styles = defaultStatusColors[currentStatus] || defaultStatusColors['default'];
    const availableStatuses = Object.keys(defaultStatusColors).filter(k => k !== 'default');

    return (
        <select
            value={currentStatus}
            onChange={(e) => onChange(e.target.value)}
            className={`text-xs font-bold rounded px-1 py-0.5 border shadow-sm transition-all cursor-cell focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50 ${className}`}
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
