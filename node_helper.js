const pronote = require('@bugsounet/pronote-api');
const npmCheck = require("@bugsounet/npmcheck");
const NodeHelper = require("node_helper");

let log = (...args) => { /* do nothing */ }

module.exports = NodeHelper.create({
   start: function() {
    /** initialize all value there **/
    this.session = null
    this.interval = null
    this.Checker = null
    this.data = {}
  },

  initialize: async function(config) {
    console.log("[PRONOTE] MMM-Pronote Version:", require('./package.json').version)
    this.config = config
    if (this.config.debug) log = (...args) => { console.log("[PRONOTE]", ...args) }
    this.updateIntervalMilliseconds = this.getUpdateIntervalMillisecondFromString(this.config.updateInterval)
    await this.pronote()
    this.sendSocketNotification("INITIALIZED")
    /** check if update of npm Library needed **/
    if (this.config.NPMCheck.useChecker) {
      var cfg = {
        dirName: __dirname,
        moduleName: this.name,
        timer: this.getUpdateIntervalMillisecondFromString(this.config.NPMCheck.delay),
        debug: this.config.debug
      }
      this.Checker= new npmCheck(cfg, update => { this.sendSocketNotification("NPM_UPDATE", update)} )
    }
    console.log("[PRONOTE] Pronote is initialized.")
  },

  pronote: async function() {
    this.session= null
    this.session = await this.login()
    if (this.config.PronoteKeepAlive && this.session) this.session.setKeepAlive(true)
    await this.fetchData()
  },

  /** Login to Pronote **/
  login: async function() {
    try {
      log("Pronote Login.")
      return await pronote.login(
        this.config.url,
        this.config.username,
        this.config.password,
        this.config.cas,
        this.config.account
      )
    } catch (err) {
      if (err.code === pronote.errors.WRONG_CREDENTIALS.code) {
        console.error("[PRONOTE] Error code: " + err.code + " - message: " + err.message)
        this.sendSocketNotification('ERROR', "Mauvais identifiants")
      } else {
        if (err.code) {
          console.error("[PRONOTE] Error code: " + err.code + " - message: " + err.message)
          this.sendSocketNotification('ERROR', err.message)
        }
        else {
          /** erreur du code merdique de Pronote-api ? **/
          console.error("[PRONOTE] API Error", err)
          this.sendSocketNotification('ERROR', "MMM-Pronote crash !")
          setTimeout(async () => { await this.pronote() } , 3000)
        }
      }
    }
  },

  fetchData: async function() {
    /** create or update data object **/
    log("Pronote fetch data.")
    if (!this.session) return console.log("[PRONOTE] Error... No session !")

    /** fetch ONLY needed part from config **/

    if (this.config.Header.displayStudentName) {
      this.data["name"] = this.session.user.name
      if (this.config.Header.displayStudentClass) {
        this.data["class"] = this.session.user.studentClass.name
      }
      if (this.config.Header.displayAvatar) {
        this.data["avatar"] = this.session.user.avatar
      }
    }

    if (this.config.Header.displayEstablishmentName) {
      this.data["establishmentsInfo"] = this.session.user.establishmentsInfo
    }

    let fromNow = new Date()
    let from = new Date(fromNow.getFullYear(),fromNow.getMonth(),fromNow.getDate(),fromNow.getHours(),0,0) // garde l'heure de cours actuelle

    if (this.config.Timetables.displayActual) {
      let to = new Date(fromNow.getFullYear(),fromNow.getMonth(),fromNow.getDate(),18,0,0) // fin des cours a 18h
      const timetableOfTheDay = await this.session.timetable(from,to)
      this.data["timetableOfTheDay"] = timetableOfTheDay

      /** convert Dates en HH:MM **/
      Array.from(this.data.timetableOfTheDay, course => {
        course.fromHour = new Date(course.from).toLocaleTimeString(this.config.language, {hour: '2-digit', minute:'2-digit'})
        course.toHour = new Date(course.to).toLocaleTimeString(this.config.language, {hour: '2-digit', minute:'2-digit'})
      })

      /** don't display if it's not today **/
      if (this.data.timetableOfTheDay.length > 0) {
        let wanted = this.data.timetableOfTheDay[0].to.toLocaleDateString(this.config.language, { day: 'numeric' })
        let now = new Date().toLocaleDateString(this.config.language, { day: 'numeric' })
        if (wanted != now) this.data["timetableOfTheDay"] = []
      }
    }

    if (this.config.Timetables.displayNextDay) {
      /** calculate next day of school **/
      let next = 1
      let day = fromNow.getDay()
      if (day == 5) next = 3
      if (day == 6) next = 2
      let FromNextDay = new Date(fromNow.getFullYear(),fromNow.getMonth(),fromNow.getDate()+next,0,0,0)
      let ToNextDay =  new Date(fromNow.getFullYear(),fromNow.getMonth(),fromNow.getDate()+next,18,0,0)
      const NextDay = new Date(FromNextDay).toLocaleDateString(this.config.language, { weekday: "long", day: 'numeric', month: "long", year: "numeric" })
      const timetableOfNextDay = await this.session.timetable(FromNextDay,ToNextDay) //fetch table Of Next day of school

      this.data["timetableOfNextDay"] = { timetable: timetableOfNextDay, timetableDay: NextDay }
      Array.from(this.data.timetableOfNextDay.timetable, (course) => {
        course.localizedFrom = (new Date(course.from)).toLocaleTimeString(this.config.language, {hour: '2-digit', minute:'2-digit'})
        course.localizedTo = (new Date(course.to)).toLocaleTimeString(this.config.language, {hour: '2-digit', minute:'2-digit'})
      })
    }

    if (this.config.Averages.display || this.config.Marks.display) {
      let toMarksSearch = new Date(fromNow.getFullYear(),fromNow.getMonth(),fromNow.getDate() + this.config.Homeworks.searchDays,0,0,0)
      const marks = await this.session.marks(from,toMarksSearch)
      this.data["marks"] = marks // notes de l'eleve
    }

    if (this.config.Homeworks.display) {
      let toHomeworksSearch = new Date(fromNow.getFullYear(),fromNow.getMonth(),fromNow.getDate() + this.config.Homeworks.searchDays,0,0,0)
      const homeworks= await this.session.homeworks(from,toHomeworksSearch)
      this.data["homeworks"] = homeworks // liste des devoirs à faire
    }

    if (this.config.Holidays.display) {
      this.data["holidays"] = this.session.params.publicHolidays
      /** don't display holidays if finish ! **/
      this.data.holidays.forEach((Holidays,nb) => {
        if (fromNow > Holidays.to) {
          log("Delete Holidays:", Holidays)
          delete this.data.holidays[nb]
        }
      })
      this.data.holidays = this.cleanArray(this.data.holidays)
    }

    if (this.config.debug) {
      //this.data["USER"] = this.session.user
      //this.data["PARAMS"] = this.session.params
      // reserved for later ?
      /*
      const infos = await this.session.infos()
      const menu = await this.session.menu()
      const evaluations = await this.session.evaluations()
      const contents = await this.session.contents()
      const absences = await this.session.absences()
      let toAbsencesSearch = new Date(fromNow.getFullYear(),fromNow.getMonth(),fromNow.getDate() + this.config.Absences.searchDays,0,0,0)

      this.data["infos"] = infos // info Prof/Etablisement -> eleves ?
      this.data["menu"] = menu // le menu de la cantine
      this.data["evaluations"] = evaluations // les resulat des evals
      this.data["contents"] = contents // je sais pas trop pour le moment c'est vide ... (peut-etre les actus ?)
      this.data["absences"] = absences // les absences ...
      */
      //log("Data:", this.data) // log as you want ;)
    }

    /** send all datas ... **/
    this.sendSocketNotification("PRONOTE_UPDATED", this.data)

    /** Ok ! All info are sended auto-update it ! **/
    this.scheduleUpdate()
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
   this.interval = setInterval(async () => {
     if (this.config.PronoteKeepAlive) await this.fetchData()
     else await this.pronote()
     log("Pronote data updated.")
   }, nextLoad)
  },

  /** ***** **/
  /** Tools **/
  /** ***** **/

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

  /** Delete empty value of an Array **/
  cleanArray: function(actual) {
    var newArray = new Array();
    for (var i = 0; i < actual.length; i++) {
      if (actual[i]) {
        newArray.push(actual[i]);
      }
    }
    return newArray;
  }
});
