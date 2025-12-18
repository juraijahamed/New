export {};

declare global {
    interface Window {
        electronAPI?: {
            minimize: () => void;
            toggleMaximize: () => void;
            close: () => void;
            isMaximized: () => Promise<boolean>;
            onMaximizeChanged: (callback: (isMaximized: boolean) => void) => (() => void) | undefined;
        };
    }
}
