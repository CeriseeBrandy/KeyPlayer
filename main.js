const { app, BrowserWindow, ipcMain, protocol, shell } = require('electron');
const path = require('path');

const MEDIA_EXTS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.mp3', '.flac', '.ogg', '.m4a', '.wav'];
const DISCORD_CLIENT_ID = '1492922829786845344';

protocol.registerSchemesAsPrivileged([
  { scheme: 'file', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

let mainWindow = null;
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

// --- FONCTION DE NETTOYAGE RPC ---
// On crée une fonction dédiée pour être sûr de l'appeler n'importe quand
async function destroyRPC() {
  if (rpc) {
    try {
      await rpc.clearActivity(); // On efface le statut d'abord
      await rpc.destroy();       // On détruit le client
      rpc = null;
      rpcReady = false;
      console.log('Discord RPC déconnecté proprement.');
    } catch (err) {
      console.error('Erreur lors de la déconnexion RPC:', err);
    }
  }
}

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

    rpc.login({ clientId: DISCORD_CLIENT_ID }).catch(() => {
      console.warn('Impossible de se connecter à Discord');
    });
  } catch (err) { 
    console.warn('Discord RPC non dispo'); 
  }
}

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function isMediaFile(filePath) {
  if (!filePath) return false;
  return MEDIA_EXTS.some(ext => filePath.toLowerCase().endsWith(ext));
}

// --- GESTION DE LA FERMETURE (CRUCIAL) ---

// S'exécute juste avant que l'app commence à se fermer
app.on('before-quit', async (event) => {
  // On détruit le RPC ici pour être sûr qu'il se coupe avant le processus
  await destroyRPC();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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

ipcMain.on('close-app', () => { 
    // On appelle app.quit() directement pour déclencher 'before-quit'
    app.quit(); 
});

ipcMain.on('minimize-app', () => { if(mainWindow) mainWindow.minimize(); });
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
