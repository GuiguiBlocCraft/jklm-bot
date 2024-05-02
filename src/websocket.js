const WebSocketClient = require('websocket').client

class Connection {
	constructor(settings = null) {
		this.serverSettings = []

		this.client = new WebSocketClient()
		this.connection = null
		this.game = null
		this.settings = settings ?? {}
		this.disconnectProperly = false
		this.on_event = () => {}
		this.on_ready = () => {}
		this.on_initialize = () => {}

		this.client.on('connectFailed', (err) => {
			console.error("Erreur de connexion au serveur : " + err)
		})

		this.client.on('connect', (connection) => {
			this.connection = connection
			this.disconnectProperly = false

			if(this.type == 'game') {
				console.log("Connecté !")
			}

			connection.on('message', (data) => {
				var message = data.utf8Data
				var code = parseInt(message)

				message = message.substring(code.toString().length)
				var received = message ? JSON.parse(message) : null

				switch(code) {
					case 0:
						connection.send('40')
						break
					case 2: // Ping
						connection.send('3')
						break
					case 40:
						this.call_join()

						if(this.type == 'game')
							this.on_ready()
						break
					case 41: // Disconnect
						console.log("Déconnecté par le serveur")
						this.disconnectProperly = true
						break
					case 42: // Events
						this.on_event(received)
						break
					case 430:
						console.log("Nom du serveur : " + received[0].roomEntry.name)

						if(typeof this.setGame === 'function')
							this.setGame(received[0].roomEntry.gameId)

						if(this.type == 'room')
							this.on_ready()
						break
				}
			})
		
			connection.on('close', (code, desc) => {
				console.log(`Connexion fermée : ${desc} (${code})`)

				if(this.disconnectProperly === false) {
					console.log("Reconnexion au serveur")
					this.connect(...this.serverSettings)
				}
			})
		})
	}

	initialize(settings) {
		this.settings = settings
	}

	connect(url, ...data) {
		this.client.connect(url.replace('https://', 'wss://') + "/socket.io/?EIO=4&transport=websocket", ...data)
		this.serverSettings = [url, ...data]
	}

	emit(...data) {
		this.connection.send("42" + JSON.stringify(data))
	}
}

module.exports = Connection