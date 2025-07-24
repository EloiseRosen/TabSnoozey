import React from 'react';
import { RECURRING_MODES } from '../constants';


/**
 * Toggle that lets the user choose whether to set the recurring snooze
 * on a repeated weekly level or repeated monthly level.
 */
function WeekMonthToggle({ recurringMode, onChange }) {
  return (
    <div className="toggle-container">
      <span
        className={`toggle-label ${recurringMode === RECURRING_MODES.WEEK ? "active" : ""}`}
        onClick={() => onChange(RECURRING_MODES.WEEK)}
      >
        week
      </span>

      <label className="switch">
        <input
          type="checkbox"
          checked={recurringMode === RECURRING_MODES.MONTH}
          onChange={(e) =>
            onChange(e.target.checked ? RECURRING_MODES.MONTH : RECURRING_MODES.WEEK)
          }
        />
        <span className="slider" />
      </label>

      <span
        className={`toggle-label ${recurringMode === RECURRING_MODES.MONTH ? "active" : ""}`}
        onClick={() => onChange(RECURRING_MODES.MONTH)}
      >
        month
      </span>
    </div>
  );
}

export default WeekMonthToggle;
