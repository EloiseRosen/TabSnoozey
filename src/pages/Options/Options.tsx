import React, { useEffect, useState } from 'react';
import './Options.css';
import tabSnoozeyIcon from '../../assets/img/icon-128.png';
import deleteIcon from '../../assets/img/delete.svg';
import Footer from './Footer';


interface SnoozedTab {
  id: string; // "snoozedTab_[UUID]"
  url: string;
  title: string; // from tab title for nice display on Options page
  reopenAt: number;
  recurringId?: string; // links to a RecurringSnooze
}

interface RecurringConfig {
  type: 'WEEKLY' | 'MONTHLY';
  days?: boolean[]; // for weekly
  day?: number; // for monthly
  time: string;
}

interface RecurringSnooze {
  id: string; // "recurringSnooze_[UUID]"
  url: string;
  title: string;
  config: RecurringConfig;
  nextOccurrence: number;
}


/** Format the reopen time nicely.
 *  If the reopen time is more than one year away show in format  "Fri, May 30, 2026".
 *  If the reopen time is <= year away show in format like "Fri, May 30, 3:15 PM", using 
 * user’s 12/24-hour preference.
 */
function formatReopenTime(reopenTimeMS: number): string {
  const reopenDateObj = new Date(reopenTimeMS);

  // determine if tab reopens more than a year from now. if so we will show year instead of time
  const MS_IN_ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
  const isMoreThan1YearAway = (reopenTimeMS - Date.now()) > MS_IN_ONE_YEAR;

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  // if more than a year away, show the year, otherwise show time
  if (isMoreThan1YearAway) {
    dateOptions.year = 'numeric';
  } else {
    dateOptions.hour = 'numeric';
    dateOptions.minute = '2-digit';

    // below commented out to use user’s 12/24-hour preference instead
    // dateOptions.hour12 = true; 
  }

  // format the date using the specified options
  return new Intl.DateTimeFormat(undefined, dateOptions).format(reopenDateObj);
}



const Options: React.FC = () => {
  const [sleepingTabsList, setSleepingTabsList] = useState<SnoozedTab[]>([]);
  const [recurringSnoozesList, setRecurringSnoozesList] = useState<RecurringSnooze[]>([]);

  /**
   * Create a nice string that describes the recurring schedule.
   * For example, "Every Mon, Wed at 2:25 PM" or "Monthly on the 2nd at 9:00 AM" or
   * "Daily at 6:00 AM".
   * Uses user's locale for time formatting.
   */
  function formatRecurringSchedule(config: RecurringConfig): string {
    // create a nice time string like "2:30 PM" or "14:30" based on user's locale
    const [hour, minute] = config.time.split(':').map(Number);

    const timeDate = new Date();
    timeDate.setHours(hour, minute, 0, 0);

    const timeStr = new Intl.DateTimeFormat(undefined, { // undefined -> use system locale
      hour: 'numeric',
      minute: '2-digit',
    }).format(timeDate);
    
    if (config.type === 'WEEKLY') {
      // converts boolean array [false, true, false, true, ...] to nice day names ['Mon', 'Wed', ...]
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const selectedDays = config.days!.map((selected, i) => selected ? days[i] : null).filter(Boolean);
      
      if (selectedDays.length === 7) {
        return `Every day at ${timeStr}`;
      }
      
      if (selectedDays.length === 5 && config.days![0] === false && config.days![6] === false) {
        return `Weekdays at ${timeStr}`;
      }
      
      if (selectedDays.length === 2 && config.days![0] === true && config.days![6] === true) {
        return `Weekends at ${timeStr}`;
      }
      
      return `Every ${selectedDays.join(', ')} at ${timeStr}`;
      
    } else if (config.type === 'MONTHLY') {
      let suffix = 'th';
      if (config.day === 1) suffix = 'st';
      else if (config.day === 2) suffix = 'nd';
      else if (config.day === 3) suffix = 'rd';
      else if (config.day === 21) suffix = 'st';
      else if (config.day === 22) suffix = 'nd';
      else if (config.day === 23) suffix = 'rd';
      else if (config.day === 31) suffix = 'st';
      
      return `Monthly on the ${config.day}${suffix} at ${timeStr}`;
    }
    
    console.error('unsupported config type:', config.type);
    return '';
  }
  
  /**
   * Get list of recurring snoozes from storage, sort, update state with it
   */
  async function updateRecurringSnoozesList() {
    try {
      const allItems = await chrome.storage.local.get(null); // null to get all keys
      const recurringSnoozesArray: RecurringSnooze[] = [];
      
      for (const [key, val] of Object.entries(allItems)) {
        if (key.startsWith('recurringSnooze_')) {
          const { url, title, config, nextOccurrence } = val as {
            url: string;
            title: string;
            config: RecurringConfig;
            nextOccurrence: number;
          };
          
          recurringSnoozesArray.push({
            id: key,
            url,
            title,
            config,
            nextOccurrence
          });
        }
      }
      
      recurringSnoozesArray.sort((a, b) => {
        return a.nextOccurrence - b.nextOccurrence;
      });
      
      setRecurringSnoozesList(recurringSnoozesArray);
    } catch (error) {
      console.error('error loading recurring snoozes:', error);
    }
  }


  /**
   * Get list of snoozed tabs from storage, filter and sort, and update state with it.
   * Only includes one-off snoozes (not recurring ones).
   */
  async function updateSnoozedTabsList() {
    try {
      const allItems = await chrome.storage.local.get(null); // null to get all keys
      const tabList: SnoozedTab[] = [];

      for (const [key, val] of Object.entries(allItems)) {
        if (key.startsWith('snoozedTab_')) {
          const { url, title, reopenAt, recurringId } = val as { 
            url: string; 
            title: string; 
            reopenAt: number;
            recurringId?: string;
          };
          
          // only add to the non-recurring list if it's NOT part of a recurring schedule
          if (!recurringId) {
            tabList.push({ id: key, url: url, title: title, reopenAt: reopenAt });
          }
        }
      }

      tabList.sort((a, b) => a.reopenAt - b.reopenAt);

      setSleepingTabsList(tabList);
    } catch (error) {
      console.error('error loading snoozed tabs:', error);
    }
  }

  /**
   * On component mount, get the list of snoozed tabs from storage.
   */
  useEffect(() => {
    updateSnoozedTabsList();
    updateRecurringSnoozesList();
  }, []);

  /**
   * When something changes the snoozed tabs, the sleeping tabs page should remain updated.
   */
  useEffect(() => {
    function handleStorageChange(
      _changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) {
      if (areaName === 'local') {
        updateSnoozedTabsList();
        updateRecurringSnoozesList();
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);


  async function handleDeleteRecurringSnooze(id: string) {
    try {
      // find and remove any pending alarms for this recurring snooze
      const allItems = await chrome.storage.local.get(null);
      for (const [key, val] of Object.entries(allItems)) {
        if (key.startsWith('snoozedTab_') && val.recurringId === id) {
          // cancel the alarm
          await chrome.alarms.clear(key).catch(() => {});
          // remove the associated snoozed tab entry from storage
          await chrome.storage.local.remove(key);
        }
      }
      // delete the recurring config
      await chrome.storage.local.remove(id);
      
      // refresh the UI
      await updateRecurringSnoozesList();
      await updateSnoozedTabsList();
    } catch (error) {
      console.error('error deleting recurring snooze:', error);
    }
  }

  /**
   * Functionality to wake up a tab immediately. Oopen the tab, remove it from storage, 
   * and re-fetch the list of snoozed tabs.
   */
  async function handleWakeNow(id: string) {
    try {
      await chrome.alarms.clear(id).catch(() => { /* alarm may not exist, ignore */ });

      const tab = sleepingTabsList.find(t => t.id === id);
      if (!tab) {
        console.error('tab not found. id:', id);
        return;
      }

      // open the tab
      await chrome.tabs.create({ url: tab.url });

      // remove the tab from storage
      await chrome.storage.local.remove(id);

      // update the list of snoozed tabs
      await updateSnoozedTabsList();
    } catch (error) {
      console.error('error waking tab:', error);
    }
  }

  /**
   * Delete a snoozed tab.
   */
  async function handleDeleteSnooze(id: string) {
    try {
      await chrome.alarms.clear(id).catch(() => { /* alarm may not exist, ignore */ });
      await chrome.storage.local.remove(id);
      await updateSnoozedTabsList();
    } catch (error) {
      console.error('error deleting snooze:', error);
    }
  }

  /**
   * Open URL immediately without altering storage, for "wake now" functionality in recurring schedules.
   */
  async function handleOpenRecurring(url: string) {
    try {
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('error opening recurring tab:', error);
    }
  }


  return (
    <div className="sleeping-tabs-container">
      <h1 className="page-heading">
        <img src={tabSnoozeyIcon} alt="Tab Snoozey icon" />
        Snoozed Tabs
      </h1>

      <h1 className="section-heading recurring">recurring</h1>


      <ul className="recurring-schedules-list">
        {recurringSnoozesList.length > 0 ? (
          recurringSnoozesList.map(schedule => (
            <li key={schedule.id} className="snoozed-item-card recurring-item">
              <div className="left-side-of-card">
                 <a
                  className="tab-title-link"
                  href={schedule.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {schedule.title || schedule.url} 
                </a>
                <div className="schedule-description">
                  {formatRecurringSchedule(schedule.config)}
                </div>
                <div className="next-occurrence">
                  Next: {formatReopenTime(schedule.nextOccurrence)}
                </div>
              </div>
              
              <div className="right-side-of-card">
                <button
                  className="wake-now-button"
                  onClick={() => handleOpenRecurring(schedule.url)}
                >
                  Wake Now
                </button>

                <button
                  className="delete-button"
                  onClick={() => handleDeleteRecurringSnooze(schedule.id)}
                  data-tooltip="Delete recurring snooze"
                >
                  <img src={deleteIcon} alt="delete X" />
                </button>
              </div>
            </li>
          ))
        ) : (
          <p className="no-snoozes-message">No recurring snoozes</p>
        )}
      </ul>



      <h1 className="section-heading one-off">non-recurring</h1>
      <ul>
        {sleepingTabsList.length > 0 ? (
          sleepingTabsList.map(tab => (
            <li key={tab.id} className="snoozed-item-card">
              <div className="left-side-of-card">
                <a
                  className="tab-title-link"
                  href={tab.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {tab.title || tab.url}
                </a>
                <div className="wake-time-text">
                  {formatReopenTime(tab.reopenAt)}
                </div>
              </div>

              <div className="right-side-of-card">
                <button
                  className="wake-now-button"
                  onClick={() => handleWakeNow(tab.id)}
                >
                  Wake Now
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteSnooze(tab.id)}
                  data-tooltip="Delete snooze"
                >
                  <img src={deleteIcon} alt="delete X" />
                </button>
              </div>
            </li>
          ))
        ) : (
          <p className="no-snoozes-message">No non-recurring snoozes</p>
        )}
      </ul>
      <Footer />
    </div>
  );
};

export default Options;
