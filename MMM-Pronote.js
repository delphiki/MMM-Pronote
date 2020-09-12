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
	},
	start: function() {
		this.config = configMerge({}, this.defaults, this.config)
		this.sendSocketNotification('SET_CONFIG', this.config);
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
	notificationReceived: function(notification, payload, sender) {
		switch (notification) {
			case "ALL_MODULES_STARTED":
				Log.info(this.config);
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
