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
    PronoteKeepAlive: true, // testing
    Timetables: {
      displayActual: true,
      displayNextDay: true,
      displayTeacher: true,
      displayRoom: true
    },
    Averages: {
      display : true,
      displayStudent: true,
      displayClass: true
    },
    Marks: {
      display: true,
      searchDays: 7,
      displayAverage: true,
      displayCoeff: true
    },
    Homeworks: {
      display: true,
      searchDays: 7,
      displayDescription: true
    },
    Holidays: {
      display: true,
      number: 3
    },
    NPMCheck: {
      useChecker: true,
      delay: "45m",
      useAlert: true
    }
  },

  start: function() {
   this.config = configMerge({}, this.defaults, this.config)
   this.userData= {}
   this.init= false
   this.error= null
   if (this.config.debug) this.log = (...args) => { console.log("[PRONOTE]", ...args) }
   else this.log = (...args) => { /* do nothing */ }
  },

  getScripts: function() {
    return ["configMerge.min.js"]
  },

  getStyles: function() {
    return ["pronote.css"]
  },

  getDom: function() {
    const fromNow = new Date()
    var wrapper = document.createElement("div")
    if (!this.init) {
      wrapper.id = "PRONOTE_LOADING"
      var logo = document.createElement("div")
      logo.id = "PRONOTE_LOGO"
      var loadingText = document.createElement("div")
      loadingText.id = "PRONOTE_TEXT_SIMPLE"
      loadingText.innerHTML = this.translate("LOADING")
      wrapper.appendChild(logo)
      wrapper.appendChild(loadingText)
    } else if(Object.keys(this.userData).length == 0) {
      wrapper.id = "PRONOTE"
      var loading = document.createElement("div")
      loading.id = "PRONOTE_LOADING"
      var logo = document.createElement("div")
      logo.id = "PRONOTE_LOGO"
      loading.appendChild(logo)
      var error = document.createElement("div")
      error.id = "PRONOTE_ERROR"
      error.innerHTML = this.error ? this.error : "Erreur... Aucune données"
      wrapper.appendChild(loading)
      wrapper.appendChild(error)
    } else {
      var icon = document.createElement("div")
      icon.id= "PRONOTE_ICON"
      icon.textContent = this.userData.establishmentsInfo[0].name
      wrapper.appendChild(icon)

      var user = document.createElement("div")
      user.id = "PRONOTE_USER"
      //user.textContent = "@bugsounet (Maternelle Sup.)" // for screenshot :)))
      user.textContent = this.userData.name + " (" + this.userData.class + ")"
      wrapper.appendChild(user)

      /** Display TimeTables **/
      var timetable = document.createElement("div")
      timetable.id = "PRONOTE_TIMETABLES"
      if (this.config.Timetables.displayActual) {
        /** Aujourd'hui ? **/
        var day = document.createElement("div")
        day.id = "PRONOTE_TIMETABLE_DAY"
        timetable.appendChild(day)
        var dayText = document.createElement("div")
        dayText.id = "PRONOTE_TEXT_UNDERLINE"
        dayText.textContent = this.userData.timetableOfTheDay.length > 0 ? "Prochains cours" : "Plus de cours aujourd'hui !"
        day.appendChild(dayText)

        this.userData.timetableOfTheDay.forEach(table => {
          if (table.hasDuplicate && table.isCancelled) return
          var Table = document.createElement("div")
          Table.id = "PRONOTE_DISPLAY_TIMETABLE"
          var Hour = document.createElement("div")
          Hour.id = "PRONOTE_HOURS"
          Hour.textContent = table.fromHour + "-" + table.toHour
          Table.appendChild(Hour)
          var Value = document.createElement("div")
          Value.id= "PRONOTE_VALUES"
          Value.textContent = table.subject
          Table.appendChild(Value)
          if (table.isCancelled || table.isAway) {
            Hour.classList.add("annuler")
            Value.classList.add("annuler")
            var Cancel = document.createElement("div")
            Cancel.id = "PRONOTE_CANCEL"
            Cancel.textContent = table.isAway ? "(Absent)" : "(Cours annulé)"
            Table.appendChild(Cancel)
          } else {
            if (this.config.Timetables.displayTeacher) {
              var teacher = document.createElement("div")
              teacher.id = "PRONOTE_TEACHER"
              teacher.textContent = "Avec "+ table.teacher
              Table.appendChild(teacher)
            }
            if (this.config.Timetables.displayRoom) {
              var room = document.createElement("div")
              room.id= "PRONOTE_ROOM"
              room.textContent = "["+ table.room+ "]"
              Table.appendChild(room)
            }
          }
          day.appendChild(Table)
        })
      }
      if (this.config.Timetables.displayNextDay) {
        /** Et demain ? **/
        var next = document.createElement("div")
        next.id = "PRONOTE_TIMETABLE_NEXT"
        timetable.appendChild(next)
        var nextText = document.createElement("div")
        nextText.id = "PRONOTE_TEXT_UNDERLINE"
        nextText.textContent = this.userData.timetableOfNextDay.timetableDay
        next.appendChild(nextText)

        this.userData.timetableOfNextDay.timetable.forEach(table => {
          if (table.hasDuplicate && table.isCancelled) return
          var Table = document.createElement("div")
          Table.id = "PRONOTE_DISPLAY_TIMETABLE"
          var Hour = document.createElement("div")
          Hour.id = "PRONOTE_HOURS"
          Hour.textContent = table.localizedFrom + "-" + table.localizedTo
          Table.appendChild(Hour)
          var Value = document.createElement("div")
          Value.id= "PRONOTE_VALUES"
          Value.textContent = table.subject
          Table.appendChild(Value)
          if (table.isCancelled || table.isAway) {
            Hour.classList.add("annuler")
            Value.classList.add("annuler")
            var Cancel = document.createElement("div")
            Cancel.textContent = table.isAway ? "(Absent)" : "(Cours annulé)"
            Table.appendChild(Cancel)
          } else {
            if (this.config.Timetables.displayTeacher) {
              var teacher = document.createElement("div")
              teacher.id = "PRONOTE_TEACHER"
              teacher.textContent = "Avec "+ table.teacher
              Table.appendChild(teacher)
            }
            if (this.config.Timetables.displayRoom) {
              var room = document.createElement("div")
              room.id= "PRONOTE_ROOM"
              room.textContent = "["+ table.room+ "]"
              Table.appendChild(room)
            }
          }
          next.appendChild(Table)
        })
       }
       wrapper.appendChild(timetable)

      /** Display average **/
      if (this.config.Averages.display && this.userData.marks.averages.student) {

        var average = document.createElement("div")
        average.id = "PRONOTE_AVERAGES"
        if (this.config.Averages.displayStudent) {
          var studentAV = document.createElement("div")
          studentAV.id = "PRONOTE_AV_STUDENT"
          studentAV.textContent = "Moyenne générale: " + this.userData.marks.averages.student
          average.appendChild(studentAV)
        }
        if (this.config.Averages.displayClass) {
          var classAV = document.createElement("div")
          classAV.id = "PRONOTE_AV_CLASS"
          classAV.textContent = "Moyenne classe: " +  this.userData.marks.averages.studentClass
          average.appendChild(classAV)
        }
        wrapper.appendChild(average)
      }

       /** Display Marks **/
       if (this.config.Marks.display && this.userData.marks.subjects.length > 0) {
         var marks = document.createElement("div")
         marks.id = "PRONOTE_MARKS"
         var marksText = document.createElement("div")
         marksText.id = "PRONOTE_TEXT_UNDERLINE"
         marksText.textContent = "Dernières notes:"
         marks.appendChild(marksText)

         /** search subjects **/
         this.userData.marks.subjects.forEach(subjects => {
           var subject = document.createElement("div")
           subject.id = "PRONOTE_SUBJECT"
           marks.appendChild(subject)
           var subjectValue = document.createElement("div")
           subjectValue.id = "PRONOTE_SUBJECT_VALUE"
           subjectValue.textContent = subjects.name + (this.config.Marks.displayAverage ? " (Moyenne: " + subjects.averages.student +")" : "")
           subject.appendChild(subjectValue)

           /** search all marks **/
           subjects.marks.forEach(marks => {
             var detail = document.createElement("div")
             detail.id = "PRONOTE_DETAIL"
             var when = document.createElement("div")
             when.id = "PRONOTE_HOURS"
             when.textContent = this.myDate(marks.date,true)
             detail.appendChild(when)
             var title = document.createElement("div")
             title.id = "PRONOTE_VALUES"
             title.textContent = marks.title
             detail.appendChild(title)
             var marksValue = document.createElement("div")
             marksValue.id = "PRONOTE_VALUES"
             marksValue.textContent = marks.value + "/" +  marks.scale
             detail.appendChild(marksValue)
             if(this.config.Marks.displayCoeff) {
               var coeff = document.createElement("div")
               coeff.id = "PRONOTE_VALUES"
               coeff.textContent = "Coeff: " + marks.coefficient
               detail.appendChild(coeff)
             }
             subject.appendChild(detail)
           })
         })
         wrapper.appendChild(marks)
       }

       /** Display Homeworks **/
       if(this.config.Homeworks.display) {
         var homeworks = document.createElement("div")
         homeworks.id = "PRONOTE_HOMEWORKS"
         var homeworksText = document.createElement("div")
         homeworksText.id = "PRONOTE_TEXT_UNDERLINE"
         homeworksText.textContent = this.userData.homeworks.length > 0 ? "Devoirs à faire:" : "Pas de devoirs cette semaine !"
         homeworks.appendChild(homeworksText)
         /** ok, Ya du boulot a faire... on affiche ça ! **/
         this.userData.homeworks.forEach(Homeworks => {
           var homeworksDetail = document.createElement("div")
           homeworksDetail.id = "PRONOTE_DETAIL"
           var homeworksDate = document.createElement("div")
           homeworksDate.id = "PRONOTE_HOURS"
           homeworksDate.textContent = this.myDate(Homeworks.for,true)
           homeworksDetail.appendChild(homeworksDate)
           var homeworksSubject = document.createElement("div")
           homeworksSubject.id = "PRONOTE_HOMEWORKS_VALUES"
           homeworksSubject.textContent = Homeworks.subject
           homeworksDetail.appendChild(homeworksSubject)
           if (this.config.Homeworks.displayDescription) {
             var homeworksTitle = document.createElement("div")
             homeworksTitle.id = "PRONOTE_VALUES_DESCRIPTION"
             homeworksTitle.textContent = Homeworks.description
             homeworksDetail.appendChild(homeworksTitle)
           }
           homeworks.appendChild(homeworksDetail)
         })
         wrapper.appendChild(homeworks)
      }
      /** vacances **/
      if(this.config.Holidays.display) {
        var holidays = document.createElement("div")
        holidays.id = "PRONOTE_HOLIDAYS"
        var holidaysText = document.createElement("div")
        holidaysText.id = "PRONOTE_TEXT_UNDERLINE"
        holidaysText.textContent = "Prochaines vacances:"
        holidays.appendChild(holidaysText)

        this.userData.holidays.forEach( (Holidays,nb) => {
          if (nb >= this.config.Holidays.number && this.config.Holidays.number) return
          var holidaysDetail = document.createElement("div")
          holidaysDetail.id = "PRONOTE_DETAIL"
          var holidaysDate = document.createElement("div")
          holidaysDate.id = "PRONOTE_HOURS"
          holidaysDate.textContent = "Du " + this.myDate(Holidays.from) + " au " + this.myDate(Holidays.to)
          holidaysDetail.appendChild(holidaysDate)
          var holidaysTitle = document.createElement("div")
          holidaysTitle.id = "PRONOTE_VALUES"
          holidaysTitle.textContent = Holidays.name
          holidaysDetail.appendChild(holidaysTitle)

          holidays.appendChild(holidaysDetail)
        })
        wrapper.appendChild(holidays)
      }
    }
    return wrapper
  },

  updateData: function(data) {
    this.userData = data
    if (!this.userData.name) return this.log ("Error... no data!")

    this.log("data:", this.userData)
    if (this.init) this.updateDom(500)
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
        if (payload) {
          this.updateData(payload)
          this.sendNotification("PRONOTE_DATA", payload)
        }
        break
      case "INITIALIZED":
          this.init = true
          this.updateDom(500)
        break
      case "ERROR":
        this.error = payload
        break
      case "NPM_UPDATE":
        if (payload && payload.length > 0) {
          if (this.config.NPMCheck.useAlert) {
            payload.forEach(npm => {
              this.sendNotification("SHOW_ALERT", {
                type: "notification" ,
                message: "[NPM] " + npm.library + " v" + npm.installed +" -> v" + npm.latest,
                title: this.translate("UPDATE_NOTIFICATION_MODULE", { MODULE_NAME: npm.module }),
                timer: this.getUpdateIntervalMillisecondFromString(this.config.NPMCheck.delay) - 2000
              })
            })
          }
          this.sendNotification("NPM_UPDATE", payload)
        }
        break
    }
  },

  /** Tools **/
  myGetDate: function (date) {
     return new Date(date.getFullYear(),date.getMonth(),date.getDate(),0,0,0)
  },

  myDate: function(date, min = false) {
    var NewDate = null
    if (!min) NewDate = new Date(date).toLocaleDateString()
    else {
      var getDate = new Date(date).getDate()
      var getMonth = new Date(date).getMonth()+1
      if (getDate < 10 ) getDate = "0"+getDate
      if (getMonth <10 ) getMonth = "0"+getMonth
      NewDate = getDate + "/" + getMonth
    }
    return NewDate
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
