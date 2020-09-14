const pronote = require('pronote-api');

let NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
   start: function() {
    /** initialize all value there **/
    this.session = null
  },

  initialize: async function(config) {
    console.log("[PRONOTE] MMM-Pronote Version:", require('./package.json').version)
    this.config = config
    this.interval = null
    this.updateIntervalMilliseconds = this.getUpdateIntervalMillisecondFromString(this.config.updateInterval)

    this.session = await this.login()
    this.session.setKeepAlive(true)

    await this.fetchData()
    this.scheduleUpdate()
    console.log("[PRONOTE] Pronote is initialized.")
  },

  /** Login to Pronote **/
  login: async function() {
    try {
      return await pronote.login(
        this.config.url,
        this.config.username,
        this.config.password,
        this.config.cas,
        this.config.account
      )
    } catch (err) {
      if (err.code === pronote.errors.WRONG_CREDENTIALS.code) {
        this.sendSocketNotification('INVALID_CREDENTIALS')
      } else {
        console.error(err)
      }
    }
  },

  fetchData: async function() {
    this.sendSocketNotification("PRONOTE_USER", this.session.user)
    const filledDaysAndWeeks = await pronote.fetchTimetableDaysAndWeeks(this.session)
    const timetableDay = this.getNextDayOfClass(filledDaysAndWeeks.filledDays)// ? pourquoi le jour d'apres ?
    const timetable = await this.getTimetable(this.session, timetableDay)
    this.sendSocketNotification("PRONOTE_TIMETABLE", {
      timetable: timetable,
      timetableDay: timetableDay
    })
  },

  getTimetable: async function(session, date = null) {
    return await session.timetable(date)
  },

  getDayOfYear: function() {
    let now = new Date()
    let start = new Date(now.getFullYear(), 0, 0)
    let diff = now - start
    let oneDay = 1000 * 60 * 60 * 24

    return Math.floor(diff / oneDay)
  },

  getNextDayOfClass: function(filledDays) {
    const currentDay = this.getDayOfYear()
    let nextDayOfClassNumber = currentDay
    for (let i = 0; i < filledDays.length; i++) {
      if (filledDays[i] > currentDay) {
        nextDayOfClassNumber = filledDays[i]
        break
      }
    }

    let firstDayOfYear = new Date((new Date()).getFullYear(), 0)

    return new Date(firstDayOfYear.setDate(nextDayOfClassNumber))
  },

  socketNotificationReceived: function(notification, payload) {
    switch(notification) {
      case 'SET_CONFIG':
        this.initialize(payload)
        break
    }
  },

  /** update process **/
  scheduleUpdate: function(delay) {
   let nextLoad = this.updateIntervalMilliseconds
   if (typeof delay !== "undefined" && delay >= 0) {
     nextLoad = delay
   }
  clearInterval(this.interval)
  this.interval = setInterval(() => {
     this.fetchData()
   }, nextLoad)
  },

  /** convert h m s to ms (good idea !) **/
  getUpdateIntervalMillisecondFromString: function(intervalString) {
   let regexString = new RegExp("^\\d+[smhd]{1}$")
   let updateIntervalMillisecond = 0

   if (regexString.test(intervalString)){
     let regexInteger = "^\\d+"
     let integer = intervalString.match(regexInteger)
     let regexLetter = "[smhd]{1}$"
     let letter = intervalString.match(regexLetter)

     let millisecondsMultiplier = 1000
      switch (String(letter)) {
        case "s":
          millisecondsMultiplier = 1000
          break
        case "m":
          millisecondsMultiplier = 1000 * 60
          break
        case "h":
          millisecondsMultiplier = 1000 * 60 * 60
          break
        case "d":
          millisecondsMultiplier = 1000 * 60 * 60 * 24
          break
      }
      // convert the string into seconds
      updateIntervalMillisecond = millisecondsMultiplier * integer
    } else {
      updateIntervalMillisecond = 1000 * 60 * 60 * 24
    }
    return updateIntervalMillisecond
  },

});
