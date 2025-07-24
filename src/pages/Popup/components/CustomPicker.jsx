import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * Renders the view for selecting a custom date/time. Displays the calendar 
 * and native `<input type="time">`.
 */
function CustomPicker({
  customDate,
  setCustomDate,
  customTime,
  setCustomTime,
  onConfirm,
  onCancel
}) {
  return (
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

      <button className="dark-pink" onClick={onConfirm}>
        Confirm
      </button>
      <button className="light-gray" onClick={onCancel}>
        Cancel
      </button>
    </>
  );
}

export default CustomPicker;
