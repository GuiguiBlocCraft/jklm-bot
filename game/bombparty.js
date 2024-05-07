const fetch = require('node-fetch').default
const delay = require('timers/promises').setTimeout

let wordlist
let wordsExcluded = []
let lastWord
let syllable
let currentPlayerPeerId = 0
let playerStatesByPeerId = {}

let wordsNumber = 0
let state = "seating"

fetch("https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/Liste-de-mots-francais-Gutenberg/liste.de.mots.francais.frgut.txt")
	.then(a => a.text())
	.then(a => wordlist = a.split("\n").map(a => strNoAccent(a.toLowerCase())))

module.exports = {
	settings: {},

	async handler(client, data) {
		// Mise à jour des variables
		switch(data[0]) {
			case 'nextTurn':
				syllable = data[2]
				currentPlayerPeerId = data[1]
				break
			case 'clearUsedWords':
				wordsExcluded = []
				break
			case 'setMilestone':
				syllable = this.settings.milestone.syllable
				playerStatesByPeerId = this.settings.milestone.playerStatesByPeerId
				currentPlayerPeerId = this.settings.milestone.currentPlayerPeerId

				if(state != this.settings.milestone.name) {
					if(this.settings.milestone.name == 'seating') {
						console.log("💣 Partie réinitialisée !")
						wordsExcluded = []
						wordsNumber = 0

						client.emit("joinRound")
					} else if(this.settings.milestone.name == 'round') {
						console.log("💣 La partie a commencé !")
					}

					state = this.settings.milestone.name
				}
				break
			case 'correctWord':
				playerStatesByPeerId[data[1].playerPeerId] = data[1]
				break
		}

		if(this.settings.milestone.name == 'seating')
			return

		if((data[0] == 'nextTurn' || data[0] == 'setMilestone' || data[0] == 'failWord') && currentPlayerPeerId === this.settings.selfPeerId) {
			if(data[0] == 'failWord') {
				console.log(`❌ Mot '${lastWord}' refusé par le serveur`)
				wordsExcluded.push(lastWord)
			}

			let player = playerStatesByPeerId[currentPlayerPeerId]
			let wordAnswers = wordlist.filter(str => str.includes(syllable) && !wordsExcluded.includes(str))

			let bonus = 10
			let wordAnswersTmp = null

			while(bonus > 0) {
				wordAnswersTmp = wordAnswers.filter(str => bonusLetters(player, str, bonus))

				if(wordAnswersTmp.length > 0) {
					wordAnswers = wordAnswersTmp
					break
				} else {
					bonus--
				}
			}

			if(wordAnswers.length === 0) {
				console.log(`❌ Aucun mot trouvé concernant la syllabe '${syllable}'`)
				wordAnswers.push("/suicide")
			}

			let wordAnswer = wordAnswers[Math.floor(Math.random() * (wordAnswers.length - 1))]

			for(let n = 1; n <= wordAnswer.length; n++) {
				if(currentPlayerPeerId !== this.settings.selfPeerId)
					return

				await delay(50)

				client.emit("setWord", wordAnswer.substring(0, n), false)

				if (n === wordAnswer.length) {
					client.emit("setWord", wordAnswer, true)
				}
			}
		}

		if(data[0] == 'setPlayerWord') {
			lastWord = data[2]
		} else if(data[0] == 'correctWord') {
			let word = lastWord.split('').filter(a => (a.charCodeAt() >= 97 && a.charCodeAt() <= 122) || a == '-').join('')

			wordsExcluded.push(word)
			console.log(`✅ Mot utilisé : ${word} | ${++wordsNumber} mot(s) utilisé(s)`)
		}
	}
}

function strNoAccent(str) {
	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function bonusLetters(player, word, bonus) {
	var stepBonus = 0

	for (let letter of Object.getOwnPropertyNames(player.bonusLetters)) {
		if (player.bonusLetters[letter] === 1 && word.includes(letter) && ++stepBonus === bonus)
			return true
	}

	return false
}