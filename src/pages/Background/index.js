chrome.alarms.onAlarm.addListener(async (alarm) => { // listen for alarms
  if (!alarm.name.startsWith('snoozedTab_')) {
    return; 
  }

  try {
    const snoozeId = alarm.name;

    const result = await chrome.storage.local.get(snoozeId);
    const snoozeInfo = result[snoozeId];

    if (snoozeInfo && snoozeInfo.url) {
      // reopen the tab
      await chrome.tabs.create({ url: snoozeInfo.url });
    }

    // remove this entry from storage
    await chrome.storage.local.remove(snoozeId);
  } catch (error) {
    console.error('error handling alarm', snoozeId);
  }
});
