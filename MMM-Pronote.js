'use strict'
/* Magic Mirror
 * Module: MMM-Pronote
 *
 * By Julien "delphiki" Villetorte
 * MIT Licensed.
 */
Module.register("MMM-Pronote", {
	defaults: {
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
		this.sendSocketNotification('SET_CONFIG', this.config);
		this.updateIntervalMilliseconds = this.getUpdateIntervalMillisecondFromString(this.config.updateInterval);

		this.scheduleUpdate();
	},
	getScripts: function() {
		return ["configMerge.min.js"]
	},
	getStyles: function() {
		return ["pronote.css"]
	},
	getTemplate: function () {
		return "pronote.njk";
	},
	getTemplateData: function () {
		return this.config;
	},
	getUpdateIntervalMillisecondFromString: function(intervalString) {
		let regexString = new RegExp("^\\d+[smhd]{1}$");
		let updateIntervalMillisecond = 0;

		if (regexString.test(intervalString)){
			let regexInteger = "^\\d+";
			let integer = intervalString.match(regexInteger);
			let regexLetter = "[smhd]{1}$";
			let letter = intervalString.match(regexLetter);

			let millisecondsMultiplier = 1000;
			switch (String(letter)) {
				case "s":
					millisecondsMultiplier = 1000;
					break;
				case "m":
					millisecondsMultiplier = 1000 * 60;
					break;
				case "h":
					millisecondsMultiplier = 1000 * 60 * 60;
					break;
				case "d":
					millisecondsMultiplier = 1000 * 60 * 60 * 24;
					break;
			}
			// convert the string into seconds
			updateIntervalMillisecond = millisecondsMultiplier * integer
		} else {
			updateIntervalMillisecond = 1000 * 60 * 60 * 24
		}

		return updateIntervalMillisecond
	},
	updateTimetable: function(data) {
		Log.info(data);
		Log.info(typeof data.timetableDay);

		Array.from(data.timetable, (course) => {
			course.localizedFrom = (new Date(course.from)).toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'});
			course.localizedTo = (new Date(course.to)).toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'});
		});
		this.config.timetable = data.timetable;
		this.config.timetableDay = new Date(data.timetableDay);
		this.config.localizedTimetableDay = this.config.timetableDay.toLocaleDateString(navigator.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	},
	scheduleUpdate: function(delay) {
		let nextLoad = this.updateIntervalMilliseconds;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		let self = this;

		setInterval(function() {
			self.updateData();
		}, nextLoad);
	},
	updateData: function() {
		this.sendSocketNotification('UPDATE_DATA');
	},
	notificationReceived: function(notification, payload, sender) {
		switch (notification) {
			case "ALL_MODULES_STARTED":
				this.sendSocketNotification('SET_CONFIG', this.config);
				break;
		}
	},
	socketNotificationReceived: function(notification, payload) {
		switch (notification) {
			case "PRONOTE_USER":
				this.config.user = payload;
				break;
			case "PRONOTE_TIMETABLE":
				this.updateTimetable(payload);
				break;
		}
		this.updateDom();
	}
});
