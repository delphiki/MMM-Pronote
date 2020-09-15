/* Magic Mirror
 * Module: MMM-Pronote
 *
 * By Julien "delphiki" Villetorte
 * and @bugsounet
 * MIT Licensed.
 */

Module.register("MMM-Pronote", {
  defaults: {
    debug: true, // set it to false if you want no debug in console
    url: null,
    username: null,
    password: null,
    cas: 'none',
    account: 'student',
    updateInterval: "1h",
  },

  start: function() {
   this.config = configMerge({}, this.defaults, this.config)
   this.userData= {}
   this.init= false
   if (this.config.debug) this.log = (...args) => { console.log("[PRONOTE]", ...args) }
   else this.log = (...args) => { /* do nothing */ }
  },

  getScripts: function() {
    return ["configMerge.min.js"]
  },

  getStyles: function() {
    return ["pronote.css"]
  },

  getTemplate: function () {
    return "pronote.njk"
  },

  getTemplateData: function () {
    return this.userData
  },

/*
 * Ju, tu veux le faire reelement avec un template ou en full JS/CSS ??
 * De mon côté en template, pas trop ma tasse de thé...
  getDom: function() {
    console.log("dom")
    var wrapper = document.createElement("div")
    if (!this.init) {
      wrapper.id = "PRONOTE_LOADING"
      wrapper.innerHTML = "chargement"

      var logo = document.createElement("div")
      logo.id = "PRONOTE_LOGO"
      wrapper.appendChild(logo)

    } else {
      // prepare Dom
    }
    return wrapper
  },
*/

  updateData: function(data) {
    this.userData = data
    if (!this.userData.name) return this.log ("Error... no data!")
    this.log("user", this.userData.name)
    this.log("data:", this.userData)

    this.log("timetable @bugsounet:", this.userData.timetableOfTheDay)
    this.log("timetable @ju:", this.userData.timetableOfNextDay)
    this.log("marks:", this.userData.marks)
    this.updateDom()  // <-- not really a good solution, we will do it in real time don't worry :)
  },

  notificationReceived: function(notification, payload, sender) {
    switch (notification) {
      case "ALL_MODULES_STARTED":
        if (!this.config.language) this.config.language = config.language
        this.sendSocketNotification('SET_CONFIG', this.config)
        break
    }
  },

  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case "PRONOTE_UPDATED":
        this.updateData(payload)
        break
    }
  },
});
