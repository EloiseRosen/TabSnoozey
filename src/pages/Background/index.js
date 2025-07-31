import { findNextWeeklyOccurrence, findNextMonthlyOccurrence } from  '../../timeUtils'

chrome.alarms.onAlarm.addListener(async (alarm) => { // listen for alarms
  if (alarm.name.startsWith('snoozedTab_')) {
    try {
      const snoozeId = alarm.name;
  
      const result = await chrome.storage.local.get(snoozeId);
      const snoozeInfo = result[snoozeId];
  
      if (snoozeInfo && snoozeInfo.url) { 
        // if this is part of a recurring schedule, check if the recurring schedule still exists
        if (snoozeInfo.recurringId) {
          // check if the recurring schedule exists
          const recurringResult = await chrome.storage.local.get(snoozeInfo.recurringId);
          const recurringInfo = recurringResult[snoozeInfo.recurringId];
          
          if (!recurringInfo) { // the recurring schedule has been deleted; don't reopen the tab
            await chrome.storage.local.remove(snoozeId);
            return;
          }
          
          // schedule the next occurrence since this is a recurring snooze
          await scheduleNextRecurrence(snoozeInfo.recurringId);
        }
        
        // reopen the tab
        await chrome.tabs.create({ url: snoozeInfo.url, active: false });
      }
  
      // remove this entry from storage
      await chrome.storage.local.remove(snoozeId);
    } catch (error) {
      console.error('error handling snoozed tab alarm:', error);
    }
  }
});

/**
 * Schedule the next occurrence of a recurring snooze (not needed for one-off snoozes).
 */
async function scheduleNextRecurrence(recurringId) {
  try {
    // get the recurrence config for this recurring snooze
    const result = await chrome.storage.local.get(recurringId);
    const recurringInfo = result[recurringId];
    
    // check if the recurring schedule exists
    if (!recurringInfo) {
      console.log(`recurring schedule ${recurringId} no longer exists.`);
      return; // The recurring schedule has been deleted
    }
    
    const config = recurringInfo.config;
    const [hour, minute] = config.time.split(':').map(Number);
    let nextOccurrence;
    
    if (config.type === 'WEEKLY') {
      nextOccurrence = findNextWeeklyOccurrence(config.days, hour, minute);
      if (!nextOccurrence) {
        console.error('failed to calculate weekly recurrence');
        return;
      }
    } else if (config.type === 'MONTHLY') {
      nextOccurrence = findNextMonthlyOccurrence(config.day, hour, minute);
    }
    if (!nextOccurrence) {
      console.error('failed to calculate monthly recurrence');
      return;
    }
    
    // update the recurring info with the next occurrence
    recurringInfo.nextOccurrence = nextOccurrence.getTime();
    await chrome.storage.local.set({ [recurringId]: recurringInfo });
    
    // create a new snooze for this occurrence
    const snoozeId = `snoozedTab_${crypto.randomUUID()}`;
    const snoozeInfo = {
      url: recurringInfo.url,
      title: recurringInfo.title,
      reopenAt: nextOccurrence.getTime(),
      recurringId: recurringId
    };
    await chrome.storage.local.set({ [snoozeId]: snoozeInfo });
    
    // create alarm for this occurrence
    chrome.alarms.create(snoozeId, { when: nextOccurrence.getTime() });
    
  } catch (error) {
    console.error('error scheduling next ocurrence of recurring snooze:', error);
  }
}
