export interface RecurringConfig {
  type: 'WEEKLY' | 'MONTHLY';
  days?: boolean[]; // for weekly
  day?: number; // for monthly
  time: string;
}

/** Format the reopen time nicely.
 *  If the reopen time is more than one year away show in format  "Fri, May 30, 2026".
 *  If the reopen time is <= year away show in format like "Fri, May 30, 3:15 PM", using 
 * user’s 12/24-hour preference.
 */
export function formatReopenTime(reopenTimeMS: number): string {
  const reopenDateObj = new Date(reopenTimeMS);

  // determine if tab reopens more than a year from now. if so we will show year instead of time
  const MS_IN_ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
  const isMoreThan1YearAway = (reopenTimeMS - Date.now()) > MS_IN_ONE_YEAR;

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  // if more than a year away, show the year, otherwise show time
  if (isMoreThan1YearAway) {
    dateOptions.year = 'numeric';
  } else {
    dateOptions.hour = 'numeric';
    dateOptions.minute = '2-digit';

    // below commented out to use user’s 12/24-hour preference instead
    // dateOptions.hour12 = true; 
  }

  // format the date using the specified options
  return new Intl.DateTimeFormat(undefined, dateOptions).format(reopenDateObj);
}


/**
 * Create a nice string that describes the recurring schedule.
 * For example, "Every Mon, Wed at 2:25 PM" or "Monthly on the 2nd at 9:00 AM" or
 * "Daily at 6:00 AM".
 * Uses user's locale for time formatting.
 */
export function formatRecurringSchedule(config: RecurringConfig): string {
  // create a nice time string like "2:30 PM" or "14:30" based on user's locale
  const [hour, minute] = config.time.split(':').map(Number);

  const timeDate = new Date();
  timeDate.setHours(hour, minute, 0, 0);

  const timeStr = new Intl.DateTimeFormat(undefined, { // undefined -> use system locale
    hour: 'numeric',
    minute: '2-digit',
  }).format(timeDate);
  
  if (config.type === 'WEEKLY') {
    // converts boolean array [false, true, false, true, ...] to nice day names ['Mon', 'Wed', ...]
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const selectedDays = config.days!.map((selected, i) => selected ? days[i] : null).filter(Boolean);
    
    if (selectedDays.length === 7) {
      return `Every day at ${timeStr}`;
    }
    
    if (selectedDays.length === 5 && config.days![0] === false && config.days![6] === false) {
      return `Weekdays at ${timeStr}`;
    }
    
    if (selectedDays.length === 2 && config.days![0] === true && config.days![6] === true) {
      return `Weekend days at ${timeStr}`;
    }
    
    return `Every ${selectedDays.join(', ')} at ${timeStr}`;
    
  } else if (config.type === 'MONTHLY') {
    let suffix = 'th';
    if (config.day === 1) suffix = 'st';
    else if (config.day === 2) suffix = 'nd';
    else if (config.day === 3) suffix = 'rd';
    else if (config.day === 21) suffix = 'st';
    else if (config.day === 22) suffix = 'nd';
    else if (config.day === 23) suffix = 'rd';
    else if (config.day === 31) suffix = 'st';
    
    return `Monthly on the ${config.day}${suffix} at ${timeStr}`;
  }
  
  console.error('unsupported config type:', config.type);
  return '';
}
