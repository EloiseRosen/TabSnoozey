import React, { useEffect, useState } from 'react';
import './Options.css';
import tabSnoozeyIcon from '../../assets/img/icon-128.png';
import coffeeMugIcon from '../../assets/img/coffee-mug.svg';
import deleteIcon from '../../assets/img/delete.svg';


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


interface SnoozedTab {
  id: string; // e.g., "snoozedTab_..."
  url: string;
  title: string;
  reopenAt: number;
}

const Options: React.FC = () => {
  const [sleepingTabsList, setSleepingTabsList] = useState<SnoozedTab[]>([]);

  /**
   * Get list of snoozed tabs from storage and update state with it.
   */
  async function updateSnoozedTabsList() {
    try {
      const allItems = await chrome.storage.local.get(null); // null to get all keys (rather than single key or array of keys)
      const tabList: SnoozedTab[] = [];

      for (const [key, val] of Object.entries(allItems)) {
        if (key.startsWith('snoozedTab_')) {
          const { url, title, reopenAt } = val as { url: string; title: string; reopenAt: number };
          tabList.push({ id: key, url: url, title: title, reopenAt: reopenAt });
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
  }, []);

  /**
   * Functionality to wake up a tab immediately. Oopen the tab, remove it from storage, 
   * and re-fetch the list of snoozed tabs.
   */
  async function handleWakeNow(id: string) {
    try {
      let tab: SnoozedTab | null = null;
      for (const currTab of sleepingTabsList) {
        if (currTab.id === id) {
          tab = currTab;
          break;
        }
      }
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
      await chrome.storage.local.remove(id);
      await updateSnoozedTabsList();
    } catch (error) {
      console.error('error deleting snooze:', error);
    }
  }

  return (
    <div className="sleeping-tabs-container">
      <h1 className="page-heading">
        <img src={tabSnoozeyIcon} alt="Tab Snoozey icon" />
        Snoozed Tabs
      </h1>

      <ul>
        {sleepingTabsList.map(tab => (
          <li key={tab.id} className="snoozed-item-card">

            <div className="left-side-of-card">
              {tab.title || tab.url}
            </div>

            <div className="right-side-of-card">
              <div className="wake-time-text">
                {formatReopenTime(tab.reopenAt)}
              </div>

              <div>
                <button
                  className="coffee-button"
                  onClick={() => handleWakeNow(tab.id)}
                  title="Wake now"
                >
                  <img src={coffeeMugIcon} alt="coffee mug" />
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteSnooze(tab.id)}
                  title="Delete snooze"
                >
                  <img src={deleteIcon} alt="delete X" />
                </button>
              </div>

            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Options;
