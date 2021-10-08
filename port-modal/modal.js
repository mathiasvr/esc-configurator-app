const portList = document.querySelector('#port-list')
const close = document.querySelector('#close-button')
const cancel = document.querySelector('#cancel-button')

const urlSearchParams = new URLSearchParams(window.location.search)
const params = Object.fromEntries(urlSearchParams.entries())
const ports = JSON.parse(params.data)

ports.forEach(p => portList.add(new Option(p)))

const click = e => {
	const index = e.target === cancel ? -1 : portList.selectedIndex
	window.location.hash = index // Pass modal result in url hash
	window.close()
}

close.addEventListener('click', click)
cancel.addEventListener('click', click)
