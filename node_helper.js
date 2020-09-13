const pronote = require('pronote-api');

let NodeHelper = require("node_helper");
let session = null;
module.exports = NodeHelper.create({
	initialize: async function(config) {
		this.config = config;
		session = await this.login();
		session.setKeepAlive(true);

		await this.fetchData();
	},
	login: async function() {
		try {
			return await pronote.login(
				this.config.url,
				this.config.username,
				this.config.password,
				this.config.cas,
				this.config.account
			);
		} catch (err) {
			if (err.code === pronote.errors.WRONG_CREDENTIALS.code) {
				this.sendSocketNotification('INVALID_CREDENTIALS');
			} else {
				console.error(err);
			}
		}
	},
	fetchData: async function() {
		this.sendSocketNotification("PRONOTE_USER", session.user);
		const filledDaysAndWeeks = await pronote.fetchTimetableDaysAndWeeks(session);
		const timetableDay = this.getNextDayOfClass(filledDaysAndWeeks.filledDays);
		const timetable = await this.getTimetable(session, timetableDay);
		this.sendSocketNotification("PRONOTE_TIMETABLE", {
			timetable: timetable,
			timetableDay: timetableDay
		});
	},
	getTimetable: async function(session, date = null) {
		return await session.timetable(date);
	},
	getDayOfYear: function() {
		let now = new Date();
		let start = new Date(now.getFullYear(), 0, 0);
		let diff = now - start;
		let oneDay = 1000 * 60 * 60 * 24;

		return Math.floor(diff / oneDay);
	},
	getNextDayOfClass: function(filledDays) {
		const currentDay = this.getDayOfYear();
		let nextDayOfClassNumber = currentDay;
		for (let i = 0; i < filledDays.length; i++) {
			if (filledDays[i] > currentDay) {
				nextDayOfClassNumber = filledDays[i];
				break
			}
		}

		let firstDayOfYear = new Date((new Date()).getFullYear(), 0);

		return new Date(firstDayOfYear.setDate(nextDayOfClassNumber));
	},
	socketNotificationReceived: function(notification, payload) {
		switch(notification) {
			case 'SET_CONFIG':
				this.initialize(payload);
				break;
			case 'UPDATE_DATA':
				this.fetchData();
				break;
		}
	},
});
