import React, { useEffect, useState } from 'react';
import OneOffCard from './components/OneOffCard';
import RecurringCard from './components/RecurringCard';
import { RecurringConfig } from './formatting';
import tabSnoozeyIcon from '../../assets/img/icon-128.png';
import Footer from './Footer';
import './Options.css';

interface SnoozedTab {
  id: string; // "snoozedTab_[UUID]"
  url: string;
  title: string; // from tab title for nice display on Options page
  reopenAt: number;
  recurringId?: string; // links to a RecurringSnooze
}

interface RecurringSnooze {
  id: string; // "recurringSnooze_[UUID]"
  url: string;
  title: string;
  config: RecurringConfig;
  nextOccurrence: number;
}

const Options: React.FC = () => {
  const [sleepingTabsList, setSleepingTabsList] = useState<SnoozedTab[]>([]);
  const [recurringSnoozesList, setRecurringSnoozesList] = useState<RecurringSnooze[]>([]);

  /**
   * Get list of  snoozes from storage, sort, update state with it
   */
  async function refreshSnoozeLists() {
    try {
      const allItems = await chrome.storage.local.get(null); // null to get all keys

      const recurring: RecurringSnooze[] = [];
      const oneOff:     SnoozedTab[]     = [];

      Object.entries(allItems).forEach(([k, v]: any) => {
        if (k.startsWith('recurringSnooze_')) {
          recurring.push({ ...v, id: k });
        } else if (k.startsWith('snoozedTab_') && !v.recurringId) {
          oneOff.push({ ...v, id: k });
        }
      });

      recurring.sort((a, b) => a.nextOccurrence - b.nextOccurrence);
      oneOff.sort((a, b) => a.reopenAt - b.reopenAt);

      setRecurringSnoozesList(recurring);
      setSleepingTabsList(oneOff);
    } catch (error) {
      console.error('error loading snoozes:', error);
    }
  }

  /**
   * On component mount, get the list of snoozed tabs from storage.
   */
  useEffect(() => {
    refreshSnoozeLists()
  }, []);

  /**
   * When something changes the snoozed tabs, the sleeping tabs page should remain up to date.
   */
  useEffect(() => {
    function onChange(
      _: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) {
      if (areaName === 'local') {
        refreshSnoozeLists()
      }
    }
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);


  async function handleDeleteRecurring(id: string) {
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
      refreshSnoozeLists()
    } catch (error) {
      console.error('error deleting recurring snooze:', error);
    }
  }

  /**
   * Functionality to wake up a tab immediately. Oopen the tab, remove it from storage, 
   * and re-fetch the list of snoozed tabs.
   */
  async function handleWakeNowOneOff(id: string) {
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
      refreshSnoozeLists();
    } catch (error) {
      console.error('error waking tab:', error);
    }
  }

  /**
   * Delete a snoozed tab.
   */
  async function handleDeleteOneOff(id: string) {
    try {
      await chrome.alarms.clear(id).catch(() => { /* alarm may not exist, ignore */ });
      await chrome.storage.local.remove(id);
      refreshSnoozeLists();
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
            <RecurringCard
              key={schedule.id}
              {...schedule}
              onWakeNow={handleOpenRecurring}
              onDelete={handleDeleteRecurring}
            />
          ))
        ) : (
          <p className="no-snoozes-message">No recurring snoozes</p>
        )}
      </ul>



      <h1 className="section-heading one-off">non-recurring</h1>
      <ul>
        {sleepingTabsList.length > 0 ? (
          sleepingTabsList.map(tab => (
            <OneOffCard
              key={tab.id}
              {...tab}
              onWakeNow={handleWakeNowOneOff}
              onDelete={handleDeleteOneOff}
            />
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
