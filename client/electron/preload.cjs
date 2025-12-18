const { contextBridge, ipcRenderer } = require('electron');

const windowControls = {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChanged: (callback) => {
        if (typeof callback !== 'function') return () => undefined;

        const listener = (_event, isMaximized) => callback(isMaximized);
        ipcRenderer.on('window:maximize-changed', listener);
        return () => ipcRenderer.removeListener('window:maximize-changed', listener);
    },
};

contextBridge.exposeInMainWorld('electronAPI', windowControls);
