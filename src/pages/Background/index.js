chrome.runtime.onInstalled.addListener(() => { // listen for when extension is installed/updated
  chrome.alarms.create('checkForOverdue_', { // recurring alarm to check for overdue tabs
    periodInMinutes: 5,
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => { // listen for alarms
  if (alarm.name.startsWith('snoozedTab_')) {
    try {
      const snoozeId = alarm.name;
  
      const result = await chrome.storage.local.get(snoozeId);
      const snoozeInfo = result[snoozeId];
  
      if (snoozeInfo && snoozeInfo.url) { // reopen the tab
        await chrome.tabs.create({ url: snoozeInfo.url });
      }
  
      // remove this entry from storage
      await chrome.storage.local.remove(snoozeId);
    } catch (error) {
      console.error('error handling snoozed tab alarm:', error);
    }
  } else if (alarm.name.startsWith('checkForOverdue_')) {
    try {
      const allItems = await chrome.storage.local.get(null);

      // for each stored item, if it’s a snoozed tab and it's overdue then open it
      // and remove it from storage
      for (const [key, val] of Object.entries(allItems)) { 
        if (key.startsWith('snoozedTab_')) { 
          const { url, reopenAt } = val;

          if (Date.now() >= reopenAt) {
            await chrome.tabs.create({ url });
            await chrome.storage.local.remove(key);
          }
        }
      }
    } catch (error) {
      console.error('Error in overdue check:', error);
    }

  }


});
