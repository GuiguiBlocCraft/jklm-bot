const fetch = require('node-fetch').default
const delay = require('timers/promises').setTimeout

const URLs = {
	"br": "",
	"de": "",
	"de-pokemon": "",
	"en": "https://raw.githubusercontent.com/dolph/dictionary/master/popular.txt",
	"en-pokemon": "https://gist.githubusercontent.com/ralts00/31415709fb34c1b2ec556c396efc3d80/raw/516ef1179f10f4a0ecb4f50f118e6757fef85243/pokemon_names.txt",
	"es": "",
	"fr": "https://raw.githubusercontent.com/chrplr/openlexicon/master/datasets-info/Liste-de-mots-francais-Gutenberg/liste.de.mots.francais.frgut.txt",
	"fr-pokemon": "https://raw.githubusercontent.com/SirSkaro/Pokedex/master/src/main/resources/dictionaries/fr/pokemon.txt",
	"nah": "",
	"pt-BR": ""
}

let wordlist
let wordsExcluded = []
let lastWord
let syllable
let currentPlayerPeerId = 0
let playerStatesByPeerId = {}

let wordsNumber = 0
let state = "seating"
let lang
let url

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
			case 'setup':
			case 'setMilestone':
				syllable = this.settings.milestone.syllable
				playerStatesByPeerId = this.settings.milestone.playerStatesByPeerId
				currentPlayerPeerId = this.settings.milestone.currentPlayerPeerId
				wordsNumber = this.settings.milestone.usedWordCount ?? 0
				lang = this.settings.rules.dictionaryId.value

				if(state != this.settings.milestone.name) {
					if(this.settings.milestone.name == 'seating') {
						console.log("💣 Partie réinitialisée !")
						wordsExcluded = []

						client.emit("joinRound")
					} else if(this.settings.milestone.name == 'round') {
						console.log("💣 La partie a commencé !")
					}

					state = this.settings.milestone.name
				}
				break
			case 'setRules':
				lang = data[1].dictionaryId
				url = null
				break
			case 'correctWord':
				playerStatesByPeerId[data[1].playerPeerId] = data[1]
				break
		}

		if(this.settings.milestone.name == 'seating')
			return

		if(!url) {
			url = URLs[lang]

			let result = await fetch(url)
				.then(a => a.text())

			wordlist = result.split("\n").map(a => strNoAccent(a.toLowerCase()))

			console.log(`📚 La liste '${this.settings.rules.dictionaryId.items.find(a => a.value === lang)?.label}' a été téléchargée`)
		}

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