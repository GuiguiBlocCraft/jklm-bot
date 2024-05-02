const fetch = require('node-fetch').default
const crypto = require('crypto')
const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs')
const os = require('os')

const Room = require('./src/room')
const Game = require('./src/game')
const bombPartyEngine = require('./game/bombparty')

const URL_API_ROOT = "https://jklm.fun/api"
const FILE_TOKEN = os.tmpdir() + '/jklm_token'

const clientRoom = new Room()
const clientGame = new Game()
const app = express()

const settings = {
	roomCode: process.argv[2]?.toUpperCase() ?? 'YVUJ',//Pour les tests
	nickname: "JKLNode",
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

	// Captcha de Google
	result = await fetch("https://www.google.com/recaptcha/api2/reload?k=6LdzYGslAAAAACxOZaQA5J0CxlfdJQUdWvJYoAFM", {
		method: 'POST'
	}).then(a => a.text())

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
			default:
				console.log('From room:', data)
				break
		}
	}

	clientGame.on_event = function(data) {
		let datas

		switch(data[0]) {
			case 'setup':
				bombPartyEngine.settings = {
					milestone: data[1].milestone,
					rules: data[1].rules,
					selfPeerId: data[1].selfPeerId
				}
				break
			case 'setRules':
				datas = Object.getOwnPropertyNames(data[1])

				for(let d of datas) {
					bombPartyEngine.settings.rules[d] = data[1][d]
				}
				break
			case 'setMilestone':
				bombPartyEngine.settings.milestone = data[1]
			default:
				if(clientGame.gameSelector == 'bombparty')
					bombPartyEngine.handler(clientGame, data)
				//else if(clientGame.gameSelector == 'popsauce')
				break
		}
	}
}

function on_chat(author, message) {
	console.log(`${author.nickname}: ${message}`)

	if(message == ".send")
		clientRoom.emit("chat", "Bonjour ! :D")
	else if(message == ".join")
		clientGame.emit("joinRound")
	else if(message == ".left")
		clientGame.emit("leaveRound")
}

// Serveur API pour le captcha
app.use(bodyParser.text());
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*')
	next()
})

app.post('/captcha', function(req, res) {
	if(settings.token) {
		res.status(201).send("Token already set")
		return
	}

	settings.token = req.body

	main()
	res.send()
})

app.listen(3000, function() {
	console.log("Veuillez copier le code pour envoyer le Captcha.")
})

function getUserToken() {
	if(fs.existsSync(FILE_TOKEN))
		return Buffer.from(fs.readFileSync(FILE_TOKEN, 'ascii'), 'base64').toString('ascii')

	const array = new Uint8Array(16)
	crypto.getRandomValues(array)
	let token = ""
	const digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-"

	for (let i = 0; i < array.length; i++) {
		token += digits[array[i] % digits.length]
	}

	fs.writeFileSync(FILE_TOKEN, Buffer.from(token, 'ascii').toString('base64'))

	return token
}