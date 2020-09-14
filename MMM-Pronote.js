'use strict'
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
    user: null,
    timetable: null,
    timetableDay: null,
    localizedTimetableDay: null,
    updateInterval: "1h",
  },

  start: function() {
   this.config = configMerge({}, this.defaults, this.config)
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
    return this.config
  },

  updateData: function(data) {
    this.config.user = data.name
    this.log("data:", data)
    this.log("typeof", typeof data.timetable.timetableDay)
    this.log("user", this.config.user)

    Array.from(data.timetable, (course) => {
      course.localizedFrom = (new Date(course.from)).toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'})
      course.localizedTo = (new Date(course.to)).toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'})
    })
    this.config.timetable = data.timetable.timetable
    this.config.timetableDay = new Date(data.timetable.timetableDay)
    this.config.localizedTimetableDay = this.config.timetableDay.toLocaleDateString(navigator.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    this.log("localized:", this.config.localizedTimetableDay)
    this.log("timetable @bugsounet:", data.timetableOfTheDay)
    this.log("timetable @ju:", data.timetable)
    this.log("marks:", data.marks)
  },

  notificationReceived: function(notification, payload, sender) {
    switch (notification) {
      case "ALL_MODULES_STARTED":
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
    this.updateDom()  // <-- not really a good solution, we will do it in real time don't worry :)
  }
});
