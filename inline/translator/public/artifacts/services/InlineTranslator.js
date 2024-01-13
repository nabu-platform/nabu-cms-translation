// this service enables inline translation in page builder
Vue.service("inlineTranslator", {
	services: ["environment", "swagger", "page"],
	data: function() {
		return {
			translationBundleId: null,
			updateTimers: {}
		}
	},
	activate: function(done) {
		this.registerListeners();
		done();
	},
	methods: {
		registerListeners: function() {
			var self = this;
			if (this.$services.environment.get("inlineTranslator")) {
				this.$services.swagger.execute("nabu.cms.translation.inline.rest.can").then(function(can) {
					if (can && can.allowed) {
						var inlineTranslationPermission = can.allowed.filter(function(x) {
							return x.name == "translationBundle.inline";
						})[0];
						if (inlineTranslationPermission && inlineTranslationPermission.context) {
							self.translationBundleId = inlineTranslationPermission.context;
							document.addEventListener("click", function(event) {
								if (self.$services.page.showRawTranslations) {
									var strings = self.getTranslatableStrings(event.target);
									if (strings && strings.length) {
										self.showTranslationBox(strings, event.x, event.y);
										event.stopPropagation();
									}
								}
								var box = document.getElementById("inlineTranslatorBox");
								if (box) {
									if (!box.contains(event.target)) {
										box.parentNode.removeChild(box);
									}
								}
							});
							document.addEventListener("keydown", function(event) {
								if (event.key && event.key.toLowerCase() == "t" && event.altKey) {
									self.$services.page.showRawTranslations = !self.$services.page.showRawTranslations;
								}
							});
						}
					}
				})
			}
		},
		getTranslatableStrings: function(element) {
			var stringContent = element.innerHTML;
			if (!stringContent) {
				stringContent = "";
			}
			if (element.attributes) {
				for (var i = 0; i < element.attributes.length; i++) {
					var item = element.attributes.item(i);
					if (item && item.value) {
						// we just append it, we want to regex a full string, translations should be encapsulated properly
						stringContent += item.value;
					}
				}
			}
			return stringContent.match(/(%\{[^}]+\})/g);
		},
		updateTranslation(current) {
			if (this.updateTimers[current.key]) {
				clearTimeout(this.updateTimers[current.key]);
			}
			var self = this;
			this.updateTimers[current.key] = setTimeout(function() {
				console.log("updating", current);
				self.$services.swagger.execute("nabu.cms.translation.inline.rest.translation.update", {
					translationBundleId: self.translationBundleId,
					body: {
						terms: [current]
					}
				})
			}, 600);
		},
		showTranslationBox: function(strings, x, y) {
			// strip the translation brackets
			var terms = strings.map(function(x) {
				return x.substring(2, x.length - 1);
			});
			var self = this;
			// we first fetch all the existing translations so you can see what it is now before you decide to change it
			if (this.translationBundleId) {
				this.$services.swagger.execute("nabu.cms.translation.inline.rest.translation.list", {translationBundleId: this.translationBundleId, term: terms}).then(function(list) {
					var existing = {};
					if (list && list.terms) {
						list.terms.forEach(function(term) {
							existing[term.key] = term;
						});
					}
					// we want to remove any existing translation box
					var box = document.getElementById("inlineTranslatorBox");
					if (box) {
						box.parentNode.removeChild(box);
					}
					box = document.createElement("div");
					box.setAttribute("id", "inlineTranslatorBox");
					box.setAttribute("class", "inline-translator-box");

					var languages = self.$services.environment.get("inlineTranslator").languages;
					terms.forEach(function(term) {
						var current = existing[term];
						if (!current) {
							current = {
								key: term
							};
						}
						if (!current.translations) {
							current.translations = [];
						}
						
						var div = document.createElement("div");
						box.appendChild(div);
						div.setAttribute("class", "inlineTranslation");
						
						var generalDiv = document.createElement("div");
						generalDiv.setAttribute("class", "inlineTranslationDescription");
						div.appendChild(generalDiv);
						// first the name
						var nameSpan = document.createElement("span");
						nameSpan.setAttribute("class", "term-name");
						nameSpan.innerHTML = term;
						generalDiv.appendChild(nameSpan);
						
						// then the label (editable)
						var labelInput = document.createElement("input");
						if (current && current.label) {
							labelInput.value = current.label;
						}
						labelInput.setAttribute("placeholder", "Short description of translation term");
						generalDiv.appendChild(labelInput);
						labelInput.addEventListener("input", function(event) {
							current.label = labelInput.value;
							self.updateTranslation(current);
						})
						
						// the description (editable)
						var descriptionInput = document.createElement("textarea");
						if (current && current.description) {
							descriptionInput.value = current.description;
						}
						descriptionInput.setAttribute("placeholder", "Longer description of translation term");
						generalDiv.appendChild(descriptionInput);
						descriptionInput.addEventListener("input", function(event) {
							current.description = descriptionInput.value;
							self.updateTranslation(current);
						});
						
						// and then the actual translations
						languages.forEach(function(language) {
							var entry = current.translations.filter(function(x) {
								return x.language == language;
							})[0];
							if (!entry) {
								entry = {
									language: language,
									translation: null
								}
								current.translations.push(entry);
							}
							var languageDiv = document.createElement("div");
							languageDiv.setAttribute("class", "inlineLanguage");	
							var lname = document.createElement("span");
							lname.innerHTML = language;
							lname.setAttribute("class", "inlineLanguageName");
							languageDiv.appendChild(lname);
							
							var translationInput = document.createElement("textarea");
							console.log("setting textarea value", entry);
							if (entry && entry.translation) {
								translationInput.value = entry.translation;
							}
							translationInput.setAttribute("placeholder", "Translation for " + language);
							languageDiv.appendChild(translationInput);
							translationInput.addEventListener("input", function(event) {
								entry.translation = translationInput.value ? translationInput.value : null;
								self.updateTranslation(current);
							});
							div.appendChild(languageDiv);
						});
						
					})
					
					document.body.appendChild(box);
				})
			}
		}
	}
})