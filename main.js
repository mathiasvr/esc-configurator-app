const { app, shell, BrowserWindow, Menu } = require('electron')

function createWindow () {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 900,
		minHeight: 600
	})

	mainWindow.loadURL('https://esc-configurator.com/')

	// Prevent navigation in main window
	mainWindow.webContents.on('will-navigate', e => {
		e.preventDefault()
	})

	// Open links in user browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (/https?:\/\//i.test(url)) shell.openExternal(url)
		return { action: 'deny' }
	})

	// Handle serial port request
	mainWindow.webContents.session.on('select-serial-port', (event, ports, _, callback) => {
		event.preventDefault()

		if (ports.length === 0) return

		const child = new BrowserWindow({
			parent: mainWindow,
			modal: true,
			show: false,
			resizable: false,
			width: 600,
			height: 300
		})

		const portNames = ports.map(p => p.displayName || p.portName)

		child.loadFile('port-modal/modal.html', { query: { data: JSON.stringify(portNames) } })

		child.once('ready-to-show', () => {
			child.show()
		})

		// TODO: https://github.com/electron/electron/issues/28215
		// child.once('close', () => {
		child.webContents.once('close', () => {
			const url = new URL(child.webContents.getURL())
			const index = parseInt(url.hash.slice(1), 10)
			const port = ports[index]
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
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

const menu = Menu.buildFromTemplate([
	{ role: 'appMenu' },
	{ role: 'fileMenu' },
	{ role: 'editMenu' },
	{ role: 'viewMenu' },
	{ role: 'windowMenu' },
	{
		role: 'help',
		submenu: [{
			label: 'Learn More',
			click: async () => await shell.openExternal('https://github.com/stylesuxx/esc-configurator')
		}]
	}
])

Menu.setApplicationMenu(menu)
