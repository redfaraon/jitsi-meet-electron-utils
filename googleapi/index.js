const electron = require('electron');
const { BrowserWindow, ipcMain } = electron;
const ipcRenderer = electron.ipcRenderer;

console.warn('HERE !!!!!!', BrowserWindow, ipcMain);
const redirectUri =  'https://lenny.jitsi.net/static/close.html'

let clientId;
let jitsiIframe;
let mainWindow;
let scopes;

let accessToken;
let profile;

class Profile {
    constructor(data) {
        this.data = data;
    }

    getEmail() {
        return this.data.email;
    }
}

const gapi = {
    get: function () {
        return Promise.resolve(gapi);
    },

    getCurrentUserProfile: function () {
        return fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json'
            + '&access_token=' + accessToken)
            .then(res => res.json())
            .then(res => {
                profile = new Profile(res);
                return profile;
            });
    },

    initializeClient: function (options) {
        clientId = options.clientId;
        scopes = options.scopes + ' profile email'

        // TODO: add all other initiaization here

        return Promise.resolve();
    },

    isSignedIn: function () {
        // TODO: add token valudation here
        return Promise.resolve(Boolean(accessToken));
    },

    requestAvailableYouTubeBroadcasts: function () {
        return fetch(
            'https://content.googleapis.com/youtube/v3/liveBroadcasts'
                + '?broadcastType=all'
                + '&mine=true&part=id%2Csnippet%2CcontentDetails%2Cstatus'
                + '&access_token=' + accessToken)
            .then(res => res.json())
            .then(res => {
                console.warn(res)
                return {
                    result: res
                };
            })
    },

    requestLiveStreamsForYouTubeBroadcast: function (boundStreamId) {
        return fetch(
            'https://content.googleapis.com/youtube/v3/liveStreams'
                + '?part=id%2Csnippet%2Ccdn%2Cstatus'
                + '&id=' + boundStreamId
                + '&access_token=' + accessToken)
            .then(res => res.json())
            .then(res => {
                console.warn(res)
                return {
                    result: res
                };
            })   
    },

    signInIfNotSignedIn: function () {
        return this.isSignedIn()
            .then(isSignedIn => {
                if (!isSignedIn) {
                    return this.showAccountSelection()
                        .then(url => this._parseCode(url))
                        // .then(code => this._getAccessToken(code))
                        .then(token => { accessToken = token });
                }
            });
    },

    showAccountSelection: function () {
        const signin = new Promise((resolve, reject) => {
            const authUrl = [
                'https://accounts.google.com/o/oauth2/v2/auth?',
                'client_id=' + clientId,
                '&redirect_uri=' + redirectUri,
                '&scope=' + scopes,
                '&response_type=token'
            ].join('');

            ipcRenderer.send('jitsi-open-google-auth', {
                authUrl: authUrl,
                callback: () => {
                    console.warn('callback?');
                }
            })
            ipcRenderer.once('async-reply', (event, url) => {
                console.warn('async reply', url);
                resolve(url);
            });
        })

        return signin;
    },


    _parseCode(url) {
        const parsedUrl = new URL(url);
        const hashArgs = parsedUrl.hash.split('&');
        const accessTokenParam = hashArgs.find(param => {
            return param.includes('access_token');
        });
        const startIndex = accessTokenParam.indexOf('=');
        return accessTokenParam.substring(startIndex + 1);
    },

    _getAccessToken(authorizationCode) {
        const params = {
            code: authorizationCode,
            client_id: clientId,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
        };
        const queryString = Object.keys(params)
            .map(key => `${key}=${params[key]}`)
            .join('&');

        return fetch('https://accounts.google.com/o/oauth2/token', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: queryString
        })
        .then(res => res.json());
    }
};

module.exports = {
    setupGoogleApiForWindow: function (iframe) {
        jitsiIframe = iframe;

        // make sure that even after reload/redirect the screensharing will be
        // available
        iframe.addEventListener('load', () => {
            iframe.contentWindow.JitsiMeetElectron
                = iframe.contentWindow.JitsiMeetElectron || {};

            iframe.contentWindow.JitsiMeetElectron.gapi = gapi;
        });
    },

    setupGoogleApiWindowOpener: function (ipcMain) {
        ipcMain.on('jitsi-open-google-auth', (mainEvent, options) => {
            const googlePopup = new BrowserWindow({
                webPreferences: {
                    nodeIntegration: false
                }
            });

            googlePopup.loadURL(options.authUrl);

            googlePopup.on('closed', () => {
                console.warn('closed');
            });

            googlePopup.webContents.on('did-navigate', (event, url) => {
                if (url.indexOf(redirectUri) === 0) {
                    console.warn('resolving');
                    mainEvent.sender.send('async-reply', url);
                    googlePopup.close();
                }
            });
        });
    }
};
