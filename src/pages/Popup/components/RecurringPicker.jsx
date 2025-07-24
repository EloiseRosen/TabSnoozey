import React from 'react';
import WeekMonthToggle from './WeekMonthToggle';
import RecurringWeek from './RecurringWeek';
import RecurringMonth from './RecurringMonth';
import { RECURRING_MODES } from '../constants';

/**
 * Allows the user to configure a recurring snooze. User selects weekly or
 * monthly, then we use the RecurringWeek component or the RecurringMonth component.
 */
function RecurringPicker({
  recurringMode,
  setRecurringMode,
  weeklySelectedDays,
  setWeeklySelectedDays,
  selectedMonthDay,
  setSelectedMonthDay,
  recurringTime,
  setRecurringTime,
  onConfirm,
  onCancel
}) {
  return (
    <>
      <WeekMonthToggle recurringMode={recurringMode} onChange={setRecurringMode} />

      {recurringMode === RECURRING_MODES.WEEK && (
        <RecurringWeek
          weeklySelectedDays={weeklySelectedDays}
          setWeeklySelectedDays={setWeeklySelectedDays}
        />
      )}

      {recurringMode === RECURRING_MODES.MONTH && (
        <RecurringMonth
          selectedMonthDay={selectedMonthDay}
          setSelectedMonthDay={setSelectedMonthDay}
        />
      )}

      <input
        type="time"
        value={recurringTime}
        onChange={(e) => setRecurringTime(e.target.value)}
      />

      <br />

      <button className="dark-pink" onClick={onConfirm}>
        Confirm
      </button>
      <button className="light-gray" onClick={onCancel}>
        Cancel
      </button>
    </>
  );
}

export default RecurringPicker;
