import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; 
import icon from '../../assets/img/icon-128.png';
import { 
  getTimeForTodayOrTomorrow, 
  getTimeDaysFromNow, 
  getTimeForNextDayOfWeek,
  findNextWeeklyOccurrence,
  findNextMonthlyOccurrence
} from '../../timeUtils'


const SPECIAL_PAGES_MESSAGE = `Note: Special pages like "chrome-extension://" or "about:" cannot be snoozed.`;

/**
 * Indicate if URL is a special page that cannot be reopened later.
 */
function isSpecialPage(url) {
  return /^(?:about|chrome|chrome-untrusted|chrome-extension|edge|view-source|devtools):/i.test(
    url
  );
}


function Popup() {
  // views are 
  // 1. MAIN_MENU
  // 2. CUSTOM (select a custom one-off date/time)
  // 3. RECURRING (select weekly/monthly recurring date/time)
  const [viewMode, setViewMode] = useState('MAIN_MENU');
  
  // state for the custom one-off view
  const [customDate, setCustomDate] = useState(new Date());
  const [customTime, setCustomTime] = useState('09:00');

  // state for the recurring view
  const [recurringMode, setRecurringMode] = useState('WEEK');  // "WEEK" or "MONTH"
  const [weeklySelectedDays, setWeeklySelectedDays] = useState([false, false, false, false, false, false, false]); // weekly checkboxes for Sun–Sat
  const [selectedMonthDay, setSelectedMonthDay] = useState(null); // day selection for month (1–31)
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
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs;
    } else {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      return tabs;
    }
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

        // store the info for this snooze in chrome local storage
        const snoozeInfo = {
          url: tab.url,
          title: tab.title || '',
          reopenAt: reopenTime
        };
        await chrome.storage.local.set({ [snoozeId]: snoozeInfo });

        // create alarm
        chrome.alarms.create(snoozeId, { when: reopenTime });

        tabIdsToClose.push(tab.id);
      }

      // show alert if any tabs were skipped
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
    setViewMode('MAIN_MENU');
    setCustomDate(new Date());
    setCustomTime('09:00');
    setRecurringMode('WEEK');
    setWeeklySelectedDays([false, false, false, false, false, false, false]);
    setSelectedMonthDay(null);
    setRecurringTime('09:00');
    setToggledToTab(true);
  }

  const presets = [
    // { buttonLabel: 'testing: 1 min', calculateTime: () => Date.now() + 1 * 60_000 },
    { buttonLabel: '1 hour', calculateTime: () => Date.now() + 60 * 60_000 },
    { buttonLabel: '5pm today', calculateTime: () => getTimeForTodayOrTomorrow(17, 0) },
    { buttonLabel: '6am tomorrow', calculateTime: () => getTimeDaysFromNow(6, 0, 1) },
    { buttonLabel: '6am Saturday', calculateTime: () => getTimeForNextDayOfWeek(6, 6, 0) }, // 6 is Saturday
    { buttonLabel: '9am Monday', calculateTime: () => getTimeForNextDayOfWeek(1, 9, 0) }, // 1 is Monday
    { buttonLabel: '30 days', calculateTime: () => getTimeDaysFromNow(6, 0, 30) },
  ];

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
    
    if (recurringMode === 'WEEK') {
      if (!weeklySelectedDays.some(day => day)) {
        alert('Please select at least one day of the week');
        return;
      }
      const nextOccurrence = findNextWeeklyOccurrence(weeklySelectedDays, hour, minute);
      createRecurringSnooze(nextOccurrence.getTime(), {
        type: 'WEEKLY',
        days: weeklySelectedDays,
        time: recurringTime
      });

    } else if (recurringMode === 'MONTH') {
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

        // check if this is a special URL that can't be reopened
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
        
        // add to list of tabs to close
        tabIdsToClose.push(tab.id);
      }

      // show alert if any tabs were skipped
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
        {/* tab/window toggle, implemented as a checkbox */}
        <div className="toggle-container">
          <span
            className={`toggle-label ${toggledToTab ? "active" : ""}`}
            onClick={() => setToggledToTab(true)}
          >
            tab
          </span>

          <label className="switch">
            <input
              type="checkbox"
              checked={!toggledToTab}
              onChange={(e) => setToggledToTab(!e.target.checked)}
            />
            <span className="slider"></span>
          </label>

          <span
            className={`toggle-label ${!toggledToTab ? "active" : ""}`}
            onClick={() => setToggledToTab(false)}
          >
            window
          </span>
        </div>

        {/* main body: Switch between 1. main menu view, 2. custom picker, 3. recurring picker (Sun-Sat view and month view) */}
        {viewMode === 'MAIN_MENU' && (
          <>
            {presets.map((preset) => (
              <button
                className="dark-pink"
                key={preset.buttonLabel}
                onClick={() => {
                  const reopenTime = preset.calculateTime();
                  snoozeTab(reopenTime);
                }}
              >
                {preset.buttonLabel}
              </button>
            ))}

            <button className="med-pink" onClick={() => setViewMode('CUSTOM')}>
              custom time
            </button>
            <button className="light-pink" onClick={() => setViewMode('RECURRING')}>
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

        {viewMode === 'CUSTOM' && (
          <>
            <DatePicker
              selected={customDate}
              onChange={(date) => setCustomDate(date)}
              inline
              fixedHeight
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
            <br />
            <button className="dark-pink" onClick={handleSnoozeCustomTime}>
              Confirm
            </button>
            <button className="light-gray" onClick={resetState}>
              Cancel
            </button>
          </>
        )}

        {viewMode === 'RECURRING' && (
          <>
            {/* recurring mode toggle: weekly vs monthly */}
            <div className="toggle-container">
              <span
                className={`toggle-label ${recurringMode === 'WEEK' ? "active" : ""}`}
                onClick={() => setRecurringMode('WEEK')}
              >
                week
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={recurringMode === 'MONTH'}
                  onChange={(e) => {
                    setRecurringMode(e.target.checked ? 'MONTH' : 'WEEK');
                  }}
                />
                <span className="slider"></span>
              </label>
              <span
                className={`toggle-label ${recurringMode === 'MONTH' ? "active" : ""}`}
                onClick={() => setRecurringMode('MONTH')}
              >
                month
              </span>
            </div>

            {recurringMode === 'WEEK' && (
              <div className="weekly-days-container">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, idx) => (
                  <label key={dayName} className="day-label">
                    <input
                      type="checkbox"
                      checked={weeklySelectedDays[idx]}
                      onChange={(e) => {
                        const newDays = [...weeklySelectedDays];
                        newDays[idx] = e.target.checked;
                        setWeeklySelectedDays(newDays);
                      }}
                    />
                    {dayName}
                  </label>
                ))}
              </div>
            )}

            {recurringMode === 'MONTH' && (
              <div className="month-day-selection">
                <label>
                  Select Day of Month
                </label>
                <div className="month-day-grid">
                  {Array.from({ length: 31 }).map((_, idx) => {
                    const dayNum = idx + 1; // 1-31
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        className={`month-day-button ${selectedMonthDay === dayNum ? 'selected' : ''}`}
                        onClick={() => setSelectedMonthDay(dayNum)}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <input
              type="time"
              value={recurringTime}
              onChange={(e) => setRecurringTime(e.target.value)}
            />

            <br />
            <button className="dark-pink" onClick={handleRecurringConfirm}>
              Confirm
            </button>
            <button className="light-gray" onClick={resetState}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Popup;
