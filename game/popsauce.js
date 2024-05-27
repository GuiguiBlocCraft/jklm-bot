const delay = require('timers/promises').setTimeout
const { popsauce } = require('../config.json')

let state = "seating"
let playerStatesByPeerId = {}
let lang = ""
let selfPeerId = 0

module.exports = {
	settings: {},

	async handler(client, data) {
		if(data.binary) return

		// Mise à jour des variables
		switch(data[0]) {
			case 'setMilestone':
				if(data[1].milestone) playerStatesByPeerId = data[1].milestone.playerStatesByPeerId ?? {}

				if(state != this.settings.milestone.name) {
					if(this.settings.milestone.name == 'seating') {
						console.log("🥤 Partie réinitialisée !")

						client.emit("joinRound")
					} else if(this.settings.milestone.name == 'round') {
						console.log("🥤 La partie a commencé !")
					}

					state = this.settings.milestone.name
				}

				break
			case 'setPlayerState':
				playerStatesByPeerId[data[1]] = data[2]
				break
			case 'setup':
				lang = this.settings.rules.dictionaryId.value
				playerStatesByPeerId = this.settings.milestone.playerStatesByPeerId ?? {}
				selfPeerId = data[1].selfPeerId
				state = this.settings.milestone.name
				break
			case 'setDictionary':
				lang = data[1].dictionaryId
				break
			case 'startChallenge':
				let question = data[1].prompt
				let binaryData = null

				if(data[1].image)
					binaryData = await client.awaitEvent(d => d.binary)

				let route = null
				let body = null

				if(data[1].image) {
					route = "searchImage"
					body = {
						"Prompt": question,
						"ImageData": binaryData.binary.toString('base64'),
						"ImageType": data[1].image.type,
						"Language": lang
					}
				} else {
					route = "askQuestion"
					body = {
						"Prompt": question,
						"Text": data[1].text,
						"Language": lang
					}
				}

				let results = await fetch(`${popsauce.api}/api/${route}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(body)
				})
					.then(a => a.json())
					.catch(() => {})

				if(!results) {
					console.error("❌ Une erreur s'est produite sur l'API")
					return
				}

				if(results.length === 0) {
					console.log("❌ Aucun résultat")
					return
				}

				console.log(results)

				for(let result of results) {
					client.emit("submitGuess", result.substring(0, 50).toLowerCase())

					await client.awaitEvent(d => d[0] === 'setPlayerState' && d[1] === selfPeerId)

					if(playerStatesByPeerId[selfPeerId]?.hasFoundSource) {
						console.log(`✅ Trouvé : ${result}`)
						break
					}

					await delay(100)
				}
				break
			case 'endChallenge':
				break
		}
	}
}