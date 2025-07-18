/**
 * Check for DST gap, fix if applicable.
 */
function setTimeSafely(date, hour, minute) {
  date.setHours(hour, minute, 0, 0);
  if (date.getHours() !== hour || date.getMinutes() !== minute) {
    while (date.getMinutes() !== minute) {
      date.setMinutes(date.getMinutes() + 1);
    }
  }
}

/**
 * Return a Date for the next occurrence of `targetDayOfWeek` at the specified
 * hour and minute.
 * 0 is Sunday, 1 is Monday, ..., 6 is Saturday
 * If today is the correct weekday but the time is in the past already, go to next week.
 */
export function getTimeForNextDayOfWeek(targetDayOfWeek, hour, minute) {
  const now = new Date();
  const date = new Date();
  setTimeSafely(date, hour, minute);

  // increment date until it matches the targetDayOfWeek AND is in future
  while (date.getDay() !== targetDayOfWeek || date <= now) {
    date.setDate(date.getDate() + 1);
    setTimeSafely(date, hour, minute);
  }
  return date.getTime();
}

/**
 * Return the specified time for today, or if it has already passed for today, return it 
 * for tomorrow.
 */
export function getTimeForTodayOrTomorrow(hour, minute) {
  const now = new Date();
  const date = new Date();
  setTimeSafely(date, hour, minute); 
  if (date <= now) {
    date.setDate(date.getDate() + 1); // use tomorrow instead
    setTimeSafely(date, hour, minute);
  }
  return date.getTime();
}

/**
 * Return a Date set at the specified time hour and minute,
 * in `daysFromNow` days from now.
 */
export function getTimeDaysFromNow(hour, minute, daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow); // add calendar days first to avoid daylight savings time issues
  setTimeSafely(date, hour, minute);
  return date.getTime();
}

/**
 * For handling weekly recurring snoozes.
 * 
 * `selectedDays` is an array of 7 booleans indicating which days are selected (Sun-Sat). 
 * index 0 = Sunday, index 1 = Monday, etc.
 * 
 * The user may have selected several days of the week for the recurring snooze. We need to 
 * find out which one of the days they selected is the one that will happen soonest from now.
 */
export function findNextWeeklyOccurrence(selectedDaysArr, hour, minute) {
  let soonestOccurrence = null;
  let minDaysUntilNext = Infinity;
  
  const now = new Date();
  const today = now.getDay();
  
  // for each day they selected, find how many days in the future that is, and keep track of which is soonest
  for (let dayIdx = 0; dayIdx < selectedDaysArr.length; dayIdx++) {
    if (selectedDaysArr[dayIdx]) {
      // calculate days until this selected day
      let daysUntil = (dayIdx - today + 7) % 7;
      
      // if the snooze is today's day of week and the time has already passed, we need to wait until next week
      if (daysUntil === 0) {
        const selectedTime = new Date();
        setTimeSafely(selectedTime, hour, minute);
        if (selectedTime <= now) {
          daysUntil = 7; // wait until next week
        }
      }

      // keep track of the soonest occurrence
      if (daysUntil < minDaysUntilNext) {
        minDaysUntilNext = daysUntil;
        soonestOccurrence = new Date();
        soonestOccurrence.setDate(soonestOccurrence.getDate() + daysUntil);
        setTimeSafely(soonestOccurrence, hour, minute);
      }
    }
  }
  return soonestOccurrence;
}

/**
 *  For handling monthly recurring snoozes.
 * 
 * Find the next occurrence of this day of month and time. If it's already passed for this month,
 * use next month. If user selects a day that doesn't exist in the month (e.g. they selected day 31,
 * and it's June), use the last day of the month instead (June 30).
 */
export function findNextMonthlyOccurrence(selectedDay, hour, minute) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // trick: create a date for "day 0" of the next month, which JS interprets as the last day of 
  // the current month. Returns the day number
  function getLastDayOfCurrMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }
  
  // helper to create occurrence date, using last day of month if selected day doesn't exist
  function createOccurrence(year, month, day) {
    const lastDay = getLastDayOfCurrMonth(year, month);
    const actualDay = Math.min(day, lastDay); // example: if user selected day 31, but there are only 29 days in this month, use 29
    
    const date = new Date(year, month, actualDay);
    setTimeSafely(date, hour, minute);
    return date;
  }
  
  // try current month first
  let nextOccurrence = createOccurrence(currentYear, currentMonth, selectedDay);
  
  // if the resulting date/time has already passed, use next month instead
  if (nextOccurrence <= now) {
    const nextMonth = currentMonth + 1;
    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const adjustedMonth = nextMonth % 12;
    
    nextOccurrence = createOccurrence(nextYear, adjustedMonth, selectedDay);
  }
  
  return nextOccurrence;
}
