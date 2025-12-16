import React from 'react';

type Status = 'pending' | 'credited' | 'transferred' | 'canceled' | 'cleared' | 'on-hold' | '' | string;

interface StatusSelectProps {
    value: Status;
    onChange: (newStatus: string) => void;
    className?: string;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'pending': { bg: '#FF9800', text: '#FFFFFF', border: '#F57C00' }, // Vibrant Orange
    'credited': { bg: '#4CAF50', text: '#FFFFFF', border: '#388E3C' }, // Vibrant Green
    'transferred': { bg: '#2196F3', text: '#FFFFFF', border: '#1976D2' }, // Vibrant Blue
    'canceled': { bg: '#F44336', text: '#FFFFFF', border: '#D32F2F' }, // Vibrant Red
    'cleared': { bg: '#FFD700', text: '#000000', border: '#FFA000' }, // Vibrant Gold (Dark text for contrast)
    'on-hold': { bg: '#795548', text: '#FFFFFF', border: '#5D4037' }, // Vibrant Brown
    'default': { bg: '#FFFFFF', text: '#374151', border: '#D1D5DB' } // Default gray
};

export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, className }) => {
    const currentStatus = value || '';
    const styles = statusColors[currentStatus] || statusColors['default'];

    return (
        <select
            value={currentStatus}
            onChange={(e) => onChange(e.target.value)}
            className={`text-xs font-bold rounded px-2 py-1.5 border shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50 ${className}`}
            style={{
                backgroundColor: styles.bg,
                color: styles.text,
                borderColor: styles.border,
            }}
            onClick={(e) => e.stopPropagation()} // Prevent row click
        >
            <option value="" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>Select Status</option>
            <option value="pending" style={{ backgroundColor: '#FF9800', color: '#FFFFFF' }}>Pending Payment</option>
            <option value="credited" style={{ backgroundColor: '#4CAF50', color: '#FFFFFF' }}>Amount Credited</option>
            <option value="transferred" style={{ backgroundColor: '#2196F3', color: '#FFFFFF' }}>Transferred to Bank</option>
            <option value="canceled" style={{ backgroundColor: '#F44336', color: '#FFFFFF' }}>Canceled</option>
            <option value="cleared" style={{ backgroundColor: '#FFD700', color: '#000000' }}>Cleared</option>
            <option value="on-hold" style={{ backgroundColor: '#795548', color: '#FFFFFF' }}>On Hold</option>
        </select>
    );
};
