// Configuration for API endpoints
// Supports environment variables for production builds

const getApiUrl = (): string => {
    // Check for environment variable first (for production builds)
    const url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return url.replace(/\/$/, '');
};

const getSocketUrl = (): string => {
    const url = import.meta.env.VITE_SOCKET_URL || getApiUrl();
    return url.replace(/\/$/, '');
};

export const config = {
    API_URL: getApiUrl(),
    SOCKET_URL: getSocketUrl(),
    API_BASE: `${getApiUrl()}/api`,

    // App metadata
    APP_NAME: 'Hawk Travelmate',
    VERSION: '1.0.0',

    // Feature flags
    ENABLE_VIRTUAL_SCROLL: true,
    VIRTUAL_SCROLL_THRESHOLD: 500, // Enable virtualization above this row count
} as const;

export default config;
