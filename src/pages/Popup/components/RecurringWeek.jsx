import React from 'react';
import { DAYS_OF_WEEK } from '../constants';

/**
 * Renders the view for selecting a recurring weekly snooze. User can select
 * 1 or more days. weeklySelectedDays is an array of booleans where each index
 * corresponds to a day of the week (0 = Sunday, 1 = Monday, ...).
  */
function RecurringWeek({ weeklySelectedDays, setWeeklySelectedDays }) {
  return (
    <div className="weekly-days-container">
      {DAYS_OF_WEEK.map((dayName, idx) => (
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
  );
}

export default RecurringWeek;
