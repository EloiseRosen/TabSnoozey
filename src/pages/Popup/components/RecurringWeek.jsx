import React from 'react';
import { DAYS_OF_WEEK } from '../constants';

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
