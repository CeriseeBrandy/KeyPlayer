const { app, BrowserWindow, ipcMain, protocol, shell } = require('electron');
const path = require('path');

const MEDIA_EXTS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.mp3', '.flac', '.ogg', '.m4a', '.wav'];
const DISCORD_CLIENT_ID = '1492922829786845344';

protocol.registerSchemesAsPrivileged([
  { scheme: 'file', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

let mainWindow = null;

// --- DISCORD RPC ---
let rpc = null;
let rpcReady = false;
let pendingActivity = null;

const IDLE_ACTIVITY = {
  details: '📂 En attente de média',
  state: 'Dans le menu',
  largeImageKey: 'keyplayer',
  largeImageText: 'KeyPlayer Media Player',
  buttons: [{ label: '🎮 GitHub', url: 'https://github.com/CeriseeBrandy' }],
  instance: false,
};

function initDiscordRPC() {
  try {
    const DiscordRPC = require('discord-rpc');
    DiscordRPC.register(DISCORD_CLIENT_ID);
    rpc = new DiscordRPC.Client({ transport: 'ipc' });
    rpc.on('ready', () => {
      rpcReady = true;
      if (pendingActivity) {
        rpc.setActivity(pendingActivity).catch(console.error);
        pendingActivity = null;
      } else {
        rpc.setActivity(IDLE_ACTIVITY).catch(console.error);
      }
    });
    rpc.login({ clientId: DISCORD_CLIENT_ID }).catch(() => {});
  } catch (err) { console.warn('Discord RPC non dispo'); }
}

// --- APP LOCK & START ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const filePath = commandLine.pop();
      if (isMediaFile(filePath)) {
        mainWindow.webContents.send('open-file', filePath);
      }
    }
  });

  app.whenReady().then(() => {
    protocol.registerFileProtocol('file', (request, callback) => {
      const url = request.url.replace('file:///', '');
      try { return callback(decodeURI(url)); } catch (error) { console.error(error); }
    });
    createWindow();
    initDiscordRPC();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 650,
    frame: false,
    backgroundColor: '#121212',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: false
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile('index.html');


  

  mainWindow.webContents.on('did-finish-load', () => {
    const filePath = process.argv.find(arg => isMediaFile(arg));
    if (filePath) {
      mainWindow.webContents.send('open-file', filePath);
    }
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-change', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-change', false);
  });

  mainWindow.on('closed', () => {
    if (rpc) rpc.destroy().catch(() => {});
    mainWindow = null;
  });
}

function isMediaFile(filePath) {
  if (!filePath) return false;
  return MEDIA_EXTS.some(ext => filePath.toLowerCase().endsWith(ext));
}

// --- IPC COMMANDS ---
ipcMain.on('discord-set-activity', (event, data) => {
  if (!rpc || !rpcReady) return;
  const activity = {
    details: data.title || 'Lecture en cours',
    state: data.artist || 'KeyPlayer',
    largeImageKey: 'keyplayer',
    largeImageText: 'KeyPlayer Media Player',
    buttons: [{ label: '🎮 GitHub', url: 'https://github.com/CeriseeBrandy' }],
    instance: false,
  };
  if (data.startTimestamp) activity.startTimestamp = data.startTimestamp;
  if (data.endTimestamp) activity.endTimestamp = data.endTimestamp;
  rpc.setActivity(activity).catch(console.error);
});

ipcMain.on('discord-idle', () => {
    if (rpc && rpcReady) rpc.setActivity(IDLE_ACTIVITY);
});

ipcMain.on('close-app', () => { if(mainWindow) mainWindow.close(); });
ipcMain.on('minimize-app', () => { if(mainWindow) mainWindow.minimize(); });
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});