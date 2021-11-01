const { app, shell, BrowserWindow, Menu } = require('electron')
const Store = require('electron-store')
const autoUpdater = require('electron-updater').autoUpdater

const store = new Store()

let clearStorage = () => {}

function createWindow () {
	const appUrl = new URL('https://esc-configurator.com/')

	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 900,
		minHeight: 600
	})

	clearStorage = () => mainWindow.webContents.session.clearStorageData()

	mainWindow.loadURL(appUrl.href)

	// Prevent navigation in main window
	mainWindow.webContents.on('will-navigate', e => {
		e.preventDefault()
	})

	// Open links in user browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (/https?:\/\//i.test(url)) shell.openExternal(url)
		return { action: 'deny' }
	})

	const grantedDevices = store.get('granted-devices', [])
	const containsDevice = device =>
		grantedDevices.some(granted =>
			Object.keys(granted).every(key => granted[key] === device[key]))

	// Allow serial permission
	mainWindow.webContents.session.setPermissionCheckHandler((_, permission) => permission === 'serial')

	// Grant permissions for previously allowed serial devices
	mainWindow.webContents.session.setDevicePermissionHandler((details) => {
		if (new URL(details.origin).hostname === appUrl.hostname && details.deviceType === 'serial') {
			return containsDevice(details.device)
		}
		return false
	})

	// Handle serial port request
	mainWindow.webContents.session.on('select-serial-port', (event, ports, _, callback) => {
		event.preventDefault()

		if (ports.length === 0) return

		const portWindow = new BrowserWindow({
			parent: mainWindow,
			modal: true,
			show: false,
			resizable: false,
			width: 600,
			height: 300
		})

		const portNames = ports.map(p => p.displayName || p.portName)

		portWindow.loadFile('port-modal/modal.html', { query: { data: JSON.stringify(portNames) } })

		portWindow.once('ready-to-show', () => portWindow.show())

		// TODO: https://github.com/electron/electron/issues/28215
		// child.once('close', () => {
		portWindow.webContents.once('close', () => {
			const url = new URL(portWindow.webContents.getURL())
			const index = parseInt(url.hash.slice(1), 10)
			const port = ports[index]

			if (port) {
				const device = {
					vendor_id: parseInt(port.vendorId, 10),
					product_id: parseInt(port.productId, 10),
					serial_number: port.serialNumber
				}

				if (!containsDevice(device)) {
					grantedDevices.push(device)
					store.set('granted-devices', grantedDevices)
				}
			}

			callback(port ? port.portId : '')
		})
	})
}

app.enableSandbox()

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})

	autoUpdater.checkForUpdatesAndNotify()
	autoUpdater.logger = require('electron-log')
	autoUpdater.logger.transports.file.level = 'info'
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

const menu = Menu.buildFromTemplate([
	{ role: 'appMenu' },
	{
		role: 'fileMenu',
		submenu: [
			{
				label: 'Clear App Data',
				click: () => {
					store.clear()
					clearStorage()
				}
			},
			{ type: 'separator' },
			{ role: process.platform === 'darwin' ? 'close' : 'quit' }
		]
	},
	{ role: 'editMenu' },
	{ role: 'viewMenu' },
	{ role: 'windowMenu' },
	{
		role: 'help',
		submenu: [{
			label: 'Learn More',
			click: async () => await shell.openExternal('https://github.com/stylesuxx/esc-configurator')
		},
		{
			label: 'App Repository',
			click: async () => await shell.openExternal('https://github.com/mathiasvr/esc-configurator-app')
		}]
	}
])

Menu.setApplicationMenu(menu)
