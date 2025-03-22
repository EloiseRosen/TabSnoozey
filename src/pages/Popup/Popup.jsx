import React from 'react';
import logo from '../../assets/img/logo.svg';
import './Popup.css';


function Popup() {
  function handleSnooze3Min() {
    // get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs.length) {
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab.id || !activeTab.url) {
        return;
      }

      try {
        // In snoozeId I also specify "snoozedTab_" because there may be other kinds of settings to save in 
        // local storage (user preferences), and other kinds of alarms (heartbeat to check no tab re-opens were
        // missed when browser was closed)
        const snoozeId =  `snoozedTab_${crypto.randomUUID()}`;
        const reopenTime =  Date.now() + 3 * 60_000; // 3 minutes from now

        // store the info for this snooze in chrome local storage
        const snoozeInfo = {
          url: activeTab.url,
          reopenAt: reopenTime
        };
        await chrome.storage.local.set({ [snoozeId]: snoozeInfo });

        // create alarm
        chrome.alarms.create(snoozeId, {
          when: reopenTime
        });

        // close the tab
        chrome.tabs.remove(activeTab.id);

      } catch (error) {
        console.error('errror snoozing tab:', error);
      }
    });
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/pages/Popup/Popup.jsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React!
        </a>

        <button onClick={handleSnooze3Min}>
          Snooze for 3 Minutes
        </button>
      </header>
    </div>
  );
}

export default Popup;
