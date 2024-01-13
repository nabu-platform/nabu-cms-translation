// this service enables inline translation in page builder
Vue.service("inlineTranslator", {
	services: ["environment", "swagger", "page"],
	data: function() {
		return {
			translationBundleId: null
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
							existing[term.term] = term;
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
						
						var div = document.createElement("div");
						box.appendChild(div);
						div.setAttribute("class", "inlineString");
						
						// first the name
						var nameSpan = document.createElement("span");
						nameSpan.setAttribute("class", "term-name");
						nameSpan.innerHTML = term;
						div.appendChild(nameSpan);
						
						// then the label (editable)
						var labelInput = document.createElement("input");
						if (current && current.label) {
							labelInput.value = current.label;
						}
						labelInput.setAttribute("placeholder", "Short description of translation term");
						div.appendChild(labelInput);
						labelInput.addEventListener("input", function(event) {
							console.log("label updated!");
						})
						
						// the description (editable)
						
						// and then the actual translations
						languages.forEach(function(language) {
							var div = document.createElement("div");
							div.setAttribute("class", "inlineLanguage");	
							var lbox = document.createElement("span");
							lbox.innerHTML = language;
							lbox.setAttribute("class", "inlineLanguageName");
							div.appendChild(lbox);
						});
						
					})
					
					document.body.appendChild(box);
				})
			}
		}
	}
})