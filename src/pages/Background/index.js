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
        
        // atomically claim this snooze (prevent duplicate opens if catch-up runs at the same time)
        const claimed = await claimSnoozeOnce(snoozeId);
        if (claimed && claimed.url) {
          // reopen the tab
          await chrome.tabs.create({ url: claimed.url, active: false });
        }
      }
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
    
    // before creating a new snooze for this occurrence, check if one already exists
    const allItems = await chrome.storage.local.get(null);
    let existingSnoozeId = null;
    for (const [key, val] of Object.entries(allItems)) {
      if (key.startsWith('snoozedTab_') && val.recurringId === recurringId && val.reopenAt === nextOccurrence.getTime()) {
        existingSnoozeId = key;
        break;
      }
    }

    if (existingSnoozeId) {
      // ensure this snooze's alarm exists
      const alarm = await chrome.alarms.get(existingSnoozeId);
      if (!alarm) {
        chrome.alarms.create(existingSnoozeId, { when: nextOccurrence.getTime() });
      }
    } else {
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
    }
    
  } catch (error) {
    console.error('error scheduling next ocurrence of recurring snooze:', error);
  }
}

/**
 * Atomically claim a snoozed tab so it can be opened only once.
 * Clear pending alarm for the id (if applicable) and remove the entry in local storage before returning it.
 * If the entry were already removed, return null (another path claimed it).
 */
async function claimSnoozeOnce(snoozeId) {
  try {
    const res = await chrome.storage.local.get(snoozeId);
    const info = res[snoozeId];
    if (!info) {
      return null;
    }
    await chrome.alarms.clear(snoozeId).catch(() => {});
    await chrome.storage.local.remove(snoozeId);
    return info;
  } catch (e) {
    console.error('claimSnoozeOnce failed for', snoozeId, e);
    return null;
  }
}

/**
 * Rehydrate alarms and catch up on missed/overdue snoozes.
 * Ensure 1-off snoozes open at most once and recurring schedules have
 * exactly 1 pending occurrence.
 */
const SNOOZED_PREFIX   = 'snoozedTab_';
const RECURRING_PREFIX = 'recurringSnooze_';

chrome.runtime.onStartup.addListener(rehydrateAlarmsAndCatchUp);
chrome.runtime.onInstalled.addListener(() => rehydrateAlarmsAndCatchUp());

async function rehydrateAlarmsAndCatchUp() {
  try {
    const allItems = await chrome.storage.local.get(null);
    const now = Date.now();

    // 1. handle one-off snoozes first
    for (const [key, value] of Object.entries(allItems)) {
      if (!key.startsWith(SNOOZED_PREFIX)) continue;
      const snooze = value;
      if (!snooze || snooze.recurringId) continue; // recurring handled below
      const when = snooze.reopenAt;

      if (!when || !snooze.url) {
        // bad entry -> clean up
        await chrome.storage.local.remove(key);
        continue;
      }

      if (when <= now) {
        // overdue/missed: atomically claim, then open once
        const claimed = await claimSnoozeOnce(key);
        if (claimed && claimed.url) {
          try {
            await chrome.tabs.create({ url: claimed.url, active: false });
          } catch (e) {
            console.error('open overdue one-off failed', e);
          }
        }
      } else {
        // future: ensure alarm still exists
        const alarm = await chrome.alarms.get(key);
        if (!alarm) {
          await chrome.alarms.create(key, { when });
        }
      }
    }

    // 2. for recurring schedules, ensure next occurrence and its alarm exist, and dedupe if needed
    for (const [recKey, recVal] of Object.entries(allItems)) {
      if (!recKey.startsWith(RECURRING_PREFIX)) continue;
      const recurring = recVal;
      if (!recurring || !recurring.config) continue;

      const { config } = recurring;
      const [hour, minute] = config.time.split(':').map(Number);

      // recompute nextOccurrence if missing or in the past
      let next = recurring.nextOccurrence;
      if (!next || next <= now) {
        const nextDate =
          config.type === 'WEEKLY'
            ? findNextWeeklyOccurrence(config.days, hour, minute)
            : findNextMonthlyOccurrence(config.day, hour, minute);

        if (!nextDate) {
          console.error('failed to compute next occurrence for', recKey);
          continue;
        }
        next = nextDate.getTime();
        recurring.nextOccurrence = next;
        await chrome.storage.local.set({ [recKey]: recurring });
      }

      // find any existing snoozes for (recurringId, reopenAt)
      const candidates = [];
      for (const [k, v] of Object.entries(allItems)) {
        if (k.startsWith(SNOOZED_PREFIX) && v.recurringId === recKey && v.reopenAt === next) {
          candidates.push([k, v]);
        }
      }

      let matchingSnoozeId = null;

      if (candidates.length > 0) {
        // remove duplicates to prevent duplicates opens
        candidates.sort((a, b) => a[0].localeCompare(b[0]));
        matchingSnoozeId = candidates[0][0];
        for (let i = 1; i < candidates.length; i++) {
          const dupKey = candidates[i][0];
          await chrome.alarms.clear(dupKey).catch(() => {});
          await chrome.storage.local.remove(dupKey);
        }
      } else {
        // create the occurrence
        const snoozeId = `snoozedTab_${crypto.randomUUID()}`;
        const snoozeInfo = {
          url:   recurring.url,
          title: recurring.title,
          reopenAt: next,
          recurringId: recKey
        };
        await chrome.storage.local.set({ [snoozeId]: snoozeInfo });
        matchingSnoozeId = snoozeId;
      }

      // ensure its alarm exists
      const alarm = await chrome.alarms.get(matchingSnoozeId);
      if (!alarm) {
        await chrome.alarms.create(matchingSnoozeId, { when: recurring.nextOccurrence });
      }
    }
  } catch (err) {
    console.error('rehydrateAlarmsAndCatchUp failed:', err);
  }
}
