import React from 'react';

function RecurringMonth({ selectedMonthDay, setSelectedMonthDay }) {
  return (
    <div className="month-day-selection">
      <label>Select Day of Month</label>

      <div className="month-day-grid">
        {Array.from({ length: 31 }).map((_, idx) => {
          const dayNum = idx + 1;
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
  );
}

export default RecurringMonth;
