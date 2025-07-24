import React from 'react';
import { PRESETS } from '../constants';

/**
 * Renders the preset buttons shown in the main view.
 */
function PresetButtons({ onSelect }) {
  return (
    <>
      {PRESETS.map(({ buttonLabel, calculateTime }) => (
        <button
          key={buttonLabel}
          className="dark-pink"
          onClick={() => onSelect(calculateTime())}
        >
          {buttonLabel}
        </button>
      ))}
    </>
  );
}

export default PresetButtons;
