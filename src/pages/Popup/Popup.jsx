import React, { useState } from 'react';
import icon from '../../assets/img/icon-128.png';
import { 
  findNextWeeklyOccurrence,
  findNextMonthlyOccurrence
} from '../../timeUtils'

import TabWindowToggle  from './components/TabWindowToggle';
import PresetButtons    from './components/PresetButtons';
import CustomPicker     from './components/CustomPicker';
import RecurringPicker  from './components/RecurringPicker';

import {
  SPECIAL_PAGES_MESSAGE,
  VIEW_MODES,
  RECURRING_MODES
} from './constants';

/**
 * Indicate if URL is a special page that cannot be reopened later.
 */
function isSpecialPage(url) {
  return /^(?:about|chrome|chrome-untrusted|chrome-extension|edge|view-source|devtools):/i.test(url);
}


function Popup() {
  const [viewMode, setViewMode] = useState(VIEW_MODES.MAIN_MENU);

  // state for the custom one-off view
  const [customDate, setCustomDate] = useState(new Date());
  const [customTime, setCustomTime] = useState('09:00');

 // state for the recurring view
  const [recurringMode, setRecurringMode] = useState(RECURRING_MODES.WEEK);
  const [weeklySelectedDays, setWeeklySelectedDays] = useState(Array(7).fill(false));
  const [selectedMonthDay, setSelectedMonthDay] = useState(null);
  const [recurringTime, setRecurringTime] = useState('09:00');

  // whether toggled to tab or window
  const [toggledToTab, setToggledToTab] = useState(true);

  /**
   * Get all tabs to snooze based on the toggle state.
   * If toggledToTab is true, return only the active tab.
   * If toggledToTab is false, return all tabs in the current window.
   */
  async function getTabsToSnooze() {
    if (toggledToTab) {
      return chrome.tabs.query({ active: true, currentWindow: true });
    }
    return chrome.tabs.query({ currentWindow: true });
  }

  /**
   * snooze the tab(s): store tab info in chrome storage, create an alarm to reopen 
   * the tab at `reopenTime`, and close the tab.
   *
   * If `reopenTime` is invalid or in the past, show alert and do nothing.
   */
  async function snoozeTab(reopenTime) {
    if (!reopenTime || reopenTime <= Date.now()) {
      alert('selected time must be a valid time in future');
      return;
    }

    try {
      const tabsToSnooze = await getTabsToSnooze();
      
      if (!tabsToSnooze.length) {
        return;
      }

      const tabIdsToClose = [];
      let hasSkippedTabs = false;

      for (const tab of tabsToSnooze) {
        if (!tab.id || !tab.url) {
          continue;

        }
        // check if this is a special URL that can't be reopened
        if (isSpecialPage(tab.url)) {
          hasSkippedTabs = true;
          continue;
        }

        const snoozeId =  `snoozedTab_${crypto.randomUUID()}`;

        await chrome.storage.local.set({
          [snoozeId]: { url: tab.url, title: tab.title || '', reopenAt: reopenTime }
        });

        chrome.alarms.create(snoozeId, { when: reopenTime });

        tabIdsToClose.push(tab.id);
      }

      if (hasSkippedTabs) {
        alert(SPECIAL_PAGES_MESSAGE);
      }

      // close all the tabs at once
      if (tabIdsToClose.length > 0) {
        chrome.tabs.remove(tabIdsToClose);
      }

    } catch (error) {
      console.error('error snoozing tab(s):', error);
    }
  }

  function resetState() {
    setViewMode(VIEW_MODES.MAIN_MENU);
    setCustomDate(new Date());
    setCustomTime('09:00');
    setRecurringMode(RECURRING_MODES.WEEK);
    setWeeklySelectedDays(Array(7).fill(false));
    setSelectedMonthDay(null);
    setRecurringTime('09:00');
    setToggledToTab(true);
  }


  /**
   * Handle the custom time input.
   */
  function handleSnoozeCustomTime() {
    const [customHour, customMinute] = customTime.split(':').map(Number);
    
    const finalDate = new Date(
      customDate.getFullYear(),
      customDate.getMonth(),
      customDate.getDate(),
      customHour,
      customMinute
    );
    const reopenTime = finalDate.getTime();
    snoozeTab(reopenTime);
  }

  /**
   * Handle the recurring snooze confirmation.
   * This will set up a recurring schedule based on user selection.
   */
  function handleRecurringConfirm() {
    const [hour, minute] = recurringTime.split(':').map(Number);
    
    if (recurringMode === RECURRING_MODES.WEEK) {
      if (!weeklySelectedDays.some(Boolean)) {
        alert('Please select at least one day of the week');
        return;
      }
      const nextOccurrence = findNextWeeklyOccurrence(weeklySelectedDays, hour, minute);
      createRecurringSnooze(nextOccurrence.getTime(), {
        type: 'WEEKLY',
        days: weeklySelectedDays,
        time: recurringTime
      });

    } else if (recurringMode === RECURRING_MODES.MONTH) {
      if (!selectedMonthDay) {
        alert('Please select at least 1 day');
        return;
      }
      const nextOccurrence = findNextMonthlyOccurrence(selectedMonthDay, hour, minute);
      createRecurringSnooze(nextOccurrence.getTime(), {
        type: 'MONTHLY',
        day: selectedMonthDay,
        time: recurringTime
      });
    }
  }

  /**
   * Create a recurring snooze.
   */
  async function createRecurringSnooze(firstOccurrence, recurringConfig) {
    try {
      const tabsToSnooze = await getTabsToSnooze();
      
      if (!tabsToSnooze.length) {
        return;
      }

      const tabIdsToClose = [];
      let hasSkippedTabs = false;

      for (const tab of tabsToSnooze) {
        if (!tab.id || !tab.url) {
          continue;
        }

        if (isSpecialPage(tab.url)) {
          hasSkippedTabs = true;
          continue;
        }

        const recurringId = `recurringSnooze_${crypto.randomUUID()}`;
        const snoozeId = `snoozedTab_${crypto.randomUUID()}`;
        
        // store the recurring info
        const recurringInfo = {
          url: tab.url,
          title: tab.title || '',
          config: recurringConfig,
          nextOccurrence: firstOccurrence
        };
        await chrome.storage.local.set({ [recurringId]: recurringInfo });
        
        // Store the info for this specific snooze occurrence
        const snoozeInfo = {
          url: tab.url,
          title: tab.title || '',
          reopenAt: firstOccurrence,
          recurringId: recurringId // reference to the recurring config
        };
        await chrome.storage.local.set({ [snoozeId]: snoozeInfo });
        
        // dreate alarm for the first occurrence
        chrome.alarms.create(snoozeId, { when: firstOccurrence });
        tabIdsToClose.push(tab.id);
      }

      if (hasSkippedTabs) {
        alert(SPECIAL_PAGES_MESSAGE);
      }
      
      // close all the tabs at once
      if (tabIdsToClose.length > 0) {
        chrome.tabs.remove(tabIdsToClose);
      }
      
    } catch (error) {
      console.error('error creating recurring snooze:', error);
    }
  }

  return (
    <div className="outer-container">
      <div className="inner-container">

        <TabWindowToggle
          toggledToTab={toggledToTab}
          onToggle={setToggledToTab}
        />

         {/* main view: Switch between 1. main menu view, 2. custom picker, 3. recurring picker (week view and month view) */}
        {viewMode === VIEW_MODES.MAIN_MENU && (
          <>
            <PresetButtons onSelect={snoozeTab} />

            <button className="med-pink" onClick={() => setViewMode(VIEW_MODES.CUSTOM)}>
              custom time
            </button>
            <button className="light-pink" onClick={() => setViewMode(VIEW_MODES.RECURRING)}>
              recurring
            </button>

            <div
              className="see-sleeping-tabs-container"
              onClick={() => {
                chrome.runtime.openOptionsPage(); // this goes to manifest.json's options_page location 
              }}
            >
              <img src={icon} alt="Tab Snoozey icon" />
              <span>see sleeping tabs</span>
            </div>
          </>
        )}

        {viewMode === VIEW_MODES.CUSTOM && (
          <CustomPicker
            customDate={customDate}
            setCustomDate={setCustomDate}
            customTime={customTime}
            setCustomTime={setCustomTime}
            onConfirm={handleSnoozeCustomTime}
            onCancel={resetState}
          />
        )}

        {viewMode === VIEW_MODES.RECURRING && (
          <RecurringPicker
            recurringMode={recurringMode}
            setRecurringMode={setRecurringMode}
            weeklySelectedDays={weeklySelectedDays}
            setWeeklySelectedDays={setWeeklySelectedDays}
            selectedMonthDay={selectedMonthDay}
            setSelectedMonthDay={setSelectedMonthDay}
            recurringTime={recurringTime}
            setRecurringTime={setRecurringTime}
            onConfirm={handleRecurringConfirm}
            onCancel={resetState}
          />
        )}
      </div>
    </div>
  );
}

export default Popup;
