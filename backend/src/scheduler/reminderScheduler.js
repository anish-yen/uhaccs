const { getDB } = require("../db/init");
const { sendReminder } = require("../ws/socket");

// TODO: Implement the reminder scheduler
//
// This module should:
// 1. On server start, load all active reminders from the DB
// 2. For each reminder, create a setInterval that fires every `interval_minutes`
// 3. When the interval fires, call sendReminder(userId, reminderData)
//    so the frontend gets a WebSocket push
// 4. Expose functions to:
//    - startReminder(reminderId)   — begin scheduling a new/reactivated reminder
//    - stopReminder(reminderId)    — clear the interval for a paused/deleted reminder
//    - restartAll()                — reload all active reminders (called on server start)

const activeTimers = new Map(); // reminderId -> intervalId

function startReminder(reminder) {
  // TODO: implement
  // const intervalMs = reminder.interval_minutes * 60 * 1000;
  // const id = setInterval(() => { sendReminder(reminder.user_id, reminder); }, intervalMs);
  // activeTimers.set(reminder.id, id);
}

function stopReminder(reminderId) {
  // TODO: implement
  // clearInterval(activeTimers.get(reminderId));
  // activeTimers.delete(reminderId);
}

function restartAll() {
  // TODO: implement
  // Clear existing timers, load active reminders from DB, start each one
}

module.exports = { startReminder, stopReminder, restartAll };
