import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; 

function Popup() {
  const [showCalenderView, setShowCalenderView] = useState(false);

  const [customDate, setCustomDate] = useState(new Date());
  const [customTime, setCustomTime] = useState('09:00');

  /**
   * snooze the tab: store tab info in chrome storage, create an alarm to reopen 
   * the tab at `reopenTime`, and close the tab.
   *
   * If `reopenTime` is invalid or in the past, show alert and do nothing.
   */
  async function snoozeTab(reopenTime) {
    if (!reopenTime || reopenTime <= Date.now()) {
      alert('selected time must be a valid time in future');
      return;
    }

    // get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) {
      return;
    }
    const activeTab = tabs[0];
    if (!activeTab.id || !activeTab.url) {
      return;
    }

    try {
      // In snoozeId I also specify "snoozedTab_" because there may be other kinds of settings to save in 
      // local storage (user preferences), and other kinds of alarms (overdue check to check no tab re-opens
      // were missed when browser was closed)
      const snoozeId =  `snoozedTab_${crypto.randomUUID()}`;

      // store the info for this snooze in chrome local storage
      const snoozeInfo = {
        url: activeTab.url,
        reopenAt: reopenTime
      };
      await chrome.storage.local.set({ [snoozeId]: snoozeInfo });

      // create alarm
      chrome.alarms.create(snoozeId, { when: reopenTime });

      // close the tab
      chrome.tabs.remove(activeTab.id);

    } catch (error) {
      console.error('errror snoozing tab:', error);
    }
  }


  /**
   * Return the specified time for today, or if it has already passed for today, return it 
   * for tomorrow.
   */
  function getTimeForTodayOrTomorrow(hour, minute) {
    const now = new Date();
    const date = new Date();
    date.setHours(hour, minute, 0, 0); 
    if (date <= now) {
      date.setDate(date.getDate() + 1); // use tomorrow instead
    }
    return date.getTime();
  }

  /**
   * Return a Date set at the specified time hour and minute,
   * in `daysFromNow` days from now.
   */
  function getTimeDaysFromNow(hour, minute, daysFromNow) {
    const date = new Date();
    date.setHours(hour, minute, 0, 0); 
    date.setDate(date.getDate() + daysFromNow);
    return date.getTime();
  }

  /**
   * Return a Date for the next occurrence of `targetDayOfWeek` at the specified
   * hour and minute.
   * 0 is Sunday, 1 is Monday, ..., 6 is Saturday
   * If today is the correct weekday but the time is in the past already, go to next week.
   */
  function getTimeForNextDayOfWeek(targetDayOfWeek, hour, minute) {
    const date = new Date();
    date.setHours(hour, minute, 0, 0); 

    // increment date until it matches the targetDayOfWeek AND is in future
    while (date.getDay() !== targetDayOfWeek || date <= now) {
      date.setDate(date.getDate() + 1);
    }
    return date.getTime();
  }

  const presets = [
    { buttonLabel: 'testing: 1 min', calculateTime: () => Date.now() + 1 * 60_000 },
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

  return (
    <div className="outer-container">
      <div className="inner-container">
        {showCalenderView ? (
          <>
            <DatePicker
              selected={customDate}
              onChange={(date) => setCustomDate(date)}
              inline
            />

            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />

            <br />
            <button onClick={handleSnoozeCustomTime}>Confirm</button>
            <button onClick={() => setShowCalenderView(false)}>Cancel</button>
          </>
        ) : (
          <>
            {presets.map((preset) => (
              <button
                className="dark-pink-button"
                key={preset.buttonLabel}
                onClick={() => {
                  const reopenTime = preset.calculateTime();
                  snoozeTab(reopenTime);
                }}
              >
                {preset.buttonLabel}
              </button>
            ))}


            <button className="med-pink-button" onClick={() => setShowCalenderView(true)}>
              custom time
            </button>
            <button className="light-pink-button" onClick={() => setShowCalenderView(true)}>
              recurring
            </button>
            see sleeping tabs
          </>
        )}
      </div>
    </div>
  );
}

export default Popup;
