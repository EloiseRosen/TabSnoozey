import React from 'react';

/**
 * Toggle that lets the user choose whether to snooze the current tab or 
 * ALL tabs in the current window.
 */
function TabWindowToggle({ toggledToTab, onToggle }) {
  return (
    <div className="toggle-container">
      <span
        className={`toggle-label ${toggledToTab ? "active" : ""}`}
        onClick={() => onToggle(true)}
      >
        tab
      </span>

      <label className="switch">
        <input
          type="checkbox"
          checked={!toggledToTab}
          onChange={(e) => onToggle(!e.target.checked)}
        />
        <span className="slider" />
      </label>

      <span
        className={`toggle-label ${!toggledToTab ?  "active" : ""}`}
        onClick={() => onToggle(false)}
      >
        window
      </span>
    </div>
  );
}

export default TabWindowToggle;
