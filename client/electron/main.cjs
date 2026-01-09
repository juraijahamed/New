const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: false,
        titleBarStyle: 'hidden',
        title: 'Hawk Travelmate Dashboard',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: process.env.NODE_ENV === 'development'
            ? path.join(__dirname, '../public/img/Hawk-icon.png')
            : path.join(__dirname, '../dist/img/Hawk-icon.png')
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        // Open DevTools only when explicitly requested to reduce noisy DevTools protocol errors
        if (process.env.SHOW_DEVTOOLS === 'true') {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
            console.log('DevTools opened (SHOW_DEVTOOLS=true)');
        } else {
            console.log('DevTools suppressed (set SHOW_DEVTOOLS=true to enable)');
        }
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('maximize', () => {
        mainWindow?.webContents.send('window:maximize-changed', true);
    });

    mainWindow.on('unmaximize', () => {
        mainWindow?.webContents.send('window:maximize-changed', false);
    });
}

ipcMain.on('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    win?.minimize();
});

ipcMain.on('window:toggle-maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

ipcMain.on('window:close', () => {
    const win = BrowserWindow.getFocusedWindow();
    win?.close();
});

ipcMain.handle('window:isMaximized', () => {
    const win = BrowserWindow.getFocusedWindow();
    return win ? win.isMaximized() : false;
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
