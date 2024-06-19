const fetch = require('node-fetch').default
const crypto = require('crypto')
const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs')
const os = require('os')

const config = require('./config.json')
const Room = require('./src/room')
const Game = require('./src/game')
const bombPartyEngine = require('./game/bombparty')
const popSauceEngine = require('./game/popsauce')

const URL_API_ROOT = "https://jklm.fun/api"
const FILE_TOKEN = os.tmpdir() + '/jklm_token'

const clientRoom = new Room()
const clientGame = new Game()
const app = express()

const roomCode = (process.argv[2] ?? process.env.ROOM_CODE)?.toUpperCase()

// Argument pour le code
if(!roomCode) {
	console.log("Vous devez renseigner le code du salon (doit être sur 4 caractères) dans la variable d'environnement ROOM_CODE ou en paramètre.")
	return
}

if(roomCode.length !== 4) {
	console.log(`Le code doit faire 4 caractères (${roomCode.length} caractères saisis).`)
	return
}

const settings = {
	roomCode: roomCode,
	nickname: config.nickname,
	userToken: getUserToken(),
	token: null,
	urlRoom: ""
}

async function main() {
	// Adresse du serveur
	var result = await fetch(URL_API_ROOT + "/joinRoom", {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ roomCode: settings.roomCode })
	})
		.then(a => a.json())

	if(result.errorCode == "noSuchRoom")
		throw new Error("Room doesn't exist")

	settings.urlRoom = result.url

	console.log("Connexion au serveur : " + settings.urlRoom)
	clientRoom.initialize(settings)
	clientGame.initialize(settings)

	clientRoom.connect(settings.urlRoom)

	// Attends avant la deuxième connexion au WebSocket
	await new Promise(resolve => clientRoom.on_ready = resolve)

	clientGame.setGame(clientRoom.gameSelector)

	if(clientRoom.gameSelector != 'selector') {
		clientGame.connect(settings.urlRoom, null, settings.urlRoom)

		await new Promise(resolve => clientGame.on_ready = resolve)
	}

	clientRoom.on_event = function(data) {
		switch(data[0]) {
			case 'chat':
				on_chat(data[1], data[2])
				break
			case 'setGame':
				if(data[1] != 'selector') {
					clientGame.setGame(data[1])
					clientGame.connect(settings.urlRoom, null, settings.urlRoom)
				}
				break
			case 'chatterAdded':
				console.log(`${data[1].nickname} a rejoint le t'chat`)
				break
			case 'chatterRemoved':
				console.log(`${data[1].nickname} a quitté le t'chat`)
				break
		}
	}

	clientGame.on_event = function(data) {
		switch(data[0]) {
			case 'setup':
				bombPartyEngine.settings = popSauceEngine.settings = {
					milestone: data[1].milestone,
					rules: data[1].rules,
					selfPeerId: data[1].selfPeerId
				}
				break
			case 'setRules':
				let datas = Object.getOwnPropertyNames(data[1])

				for(let d of datas) {
					bombPartyEngine.settings.rules[d].value = popSauceEngine.settings.rules[d].value = data[1][d]
				}
				break
			case 'setMilestone':
				bombPartyEngine.settings.milestone = popSauceEngine.settings.milestone = data[1]
				break
		}

		if(clientGame.gameSelector == 'bombparty')
			bombPartyEngine.handler(clientGame, data)
		else if(clientGame.gameSelector == 'popsauce')
			popSauceEngine.handler(clientGame, data)
	}
}

function on_chat(author, message) {
	console.log(`(${author.peerId}) ${author.nickname}: ${message}`)

	if(message == ".ping")
		clientRoom.emit("chat", "Pong ! 🏓")
	else if(message == ".join")
		clientGame.emit("joinRound")
	else if(message == ".leave")
		clientGame.emit("leaveRound")
}

// Serveur API pour le captcha
app.use(bodyParser.text());
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*')
	next()
})

app.post('/captcha', function(req, res) {
	if(typeof req.body !== "string") {
		res.status(400).end()
		return
	}

	if(settings.token) {
		res.end("Token already set")
		return
	}

	settings.token = req.body

	main()
	res.end()

	webServer.close()
})

const webServer = app.listen(3000, '127.0.0.1', function() {
	console.log("Port ouvert sur http://localhost:3000 pour le Captcha.")
})

function getUserToken() {
	if(config.use_same_token && fs.existsSync(FILE_TOKEN))
		return Buffer.from(fs.readFileSync(FILE_TOKEN, 'ascii'), 'base64').toString('ascii')

	const array = new Uint8Array(16)
	crypto.getRandomValues(array)
	let token = ""
	const digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-"

	for(let i = 0; i < array.length; i++) {
		token += digits[array[i] % digits.length]
	}

	if(config.use_same_token)
		fs.writeFileSync(FILE_TOKEN, Buffer.from(token, 'ascii').toString('base64'))

	return token
}