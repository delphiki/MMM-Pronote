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
    displayTimetable: true,
    displayAverage: true,
    displayMarks: true
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
/*
  getTemplate: function () {
    return "pronote.njk"
  },

  getTemplateData: function () {
    return this.userData
  },
*/

/*
 * Ju, tu veux le faire reelement avec un template ou en full JS/CSS ??
 * De mon côté en template, pas trop ma tasse de thé...
 */
  getDom: function() {
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
    } else {
      var icon = document.createElement("div")
      icon.id= "PRONOTE_ICON"
      icon.textContent = this.userData.establishmentsInfo[0].name
      wrapper.appendChild(icon)

      var user = document.createElement("div")
      user.id = "PRONOTE_USER"
      user.textContent = this.userData.name + " (" + this.userData.class + ")"
      wrapper.appendChild(user)

      /** Display TimeTables **/
      if (this.config.displayTimetable) {
        var timetable = document.createElement("div")
        timetable.id = "PRONOTE_TIMETABLES"

        /** Aujourd'hui ? **/
        var day = document.createElement("div")
        day.id = "PRONOTE_TIMETABLE_DAY"
        timetable.appendChild(day)
        var dayText = document.createElement("div")
        dayText.id = "PRONOTE_TEXT_UNDERLINE"
        dayText.textContent = this.userData.timetableOfTheDay.length > 0 ? "Prochains cours" : "Plus de cours aujourd'hui !"
        day.appendChild(dayText)

        this.userData.timetableOfTheDay.forEach(table => {
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
            Cancel.textContent = table.isAway ? "(Absent)" : "(Cours annulé)"
            Table.appendChild(Cancel)
          }
          day.appendChild(Table)
        })

        /** Et demain ? **/
        var next = document.createElement("div")
        next.id = "PRONOTE_TIMETABLE_NEXT"
        timetable.appendChild(next)
        var nextText = document.createElement("div")
        nextText.id = "PRONOTE_TEXT_UNDERLINE"
        nextText.textContent = this.userData.timetableOfNextDay.localizedTimetableDay
        next.appendChild(nextText)

        this.userData.timetableOfNextDay.timetable.forEach(table => {
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
          }
          next.appendChild(Table)
        })
        wrapper.appendChild(timetable)
      }

      /** Display average @tofinish **/
      if (this.config.displayAverage) {
        var average = document.createElement("div")
        average.id = "PRONOTE_AVERAGES"
        var averageText = document.createElement("div")
        averageText.id = "PRONOTE_TEXT_SIMPLE"
        averageText.textContent = "Moyenne générale: " + this.userData.marks.averages.student + " - Moyenne classe: " +  this.userData.marks.averages.studentClass
        average.appendChild(averageText)
        wrapper.appendChild(average)
       }

       /** Display Marks @tofinish too !**/
       if (this.config.displayMarks) {
         var marks = document.createElement("div")
         marks.id = "PRONOTE_MARKS"
         var marksText = document.createElement("div")
         marksText.id = "PRONOTE_TEXT_UNDERLINE"
         marksText.textContent = "Dernières notes:"
         marks.appendChild(marksText)
         this.userData.marks.subjects.forEach(subjects => {
           var subject = document.createElement("div")
           subject.id = "PRONOTE_SUBJECT"
           marks.appendChild(subject)
           var subjectValue = document.createElement("div")
           subjectValue.id = "PRONOTE_SUBJECT_VALUE"
           subjectValue.textContent = subjects.name + " (Moyenne: " + subjects.averages.student +")"
           subject.appendChild(subjectValue)
           subjects.marks.forEach(marks => {
             var detail = document.createElement("div")
             detail.id = "PRONOTE_DETAIL"
             // @todo better ...
             detail.textContent = new Date(marks.date).toLocaleDateString() + " " + marks.title + ": " + marks.value + "/" + marks.scale + " Coeff: " + marks.coefficient 
             subject.appendChild(detail)
           })
         })
         wrapper.appendChild(marks)
       }
    }
    return wrapper
  },

  updateData: function(data) {
    this.userData = data
    if (!this.userData.name) return this.log ("Error... no data!")

    this.log("data:", this.userData)

    this.log("marks:", this.userData.marks)
    if (this.init) this.updateDom(1000)
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
      case "INITIALIZED":
        this.init = true
        this.updateDom(500)
        break
    }
  },
});
