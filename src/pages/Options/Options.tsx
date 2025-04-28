import React, { useEffect, useState } from 'react';
import './Options.css';
import coffeeMugIcon from '../../assets/img/coffee-mug.svg';


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
          const { url, title, reopenAt } = val as { url: string; title: string, reopenAt: number };
          tabList.push({ id: key, url: url, title: title, reopenAt: reopenAt });
        }
      }

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

  return (
    <div className="sleeping-tabs-container">
      <h1>Snoozed Tabs</h1>

      {sleepingTabsList.length === 0 ? (
        <p>No sleeping tabs.</p>
      ) : (
        <ul>
          {sleepingTabsList.map(tab => (
            <li key={tab.id}>
              <strong>{tab.title || tab.url}</strong>
              <br />
              Wakes at: <em>{new Date(tab.reopenAt).toLocaleString()}</em>
              <br />

              <button className="coffee-button" onClick={() => handleWakeNow(tab.id)}>
                <img src={coffeeMugIcon} alt="coffee mug" />
              </button>

            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Options;
