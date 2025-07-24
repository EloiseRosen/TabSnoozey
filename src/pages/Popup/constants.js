import {
  getTimeForTodayOrTomorrow,
  getTimeDaysFromNow,
  getTimeForNextDayOfWeek
} from '../../timeUtils';

export const SPECIAL_PAGES_MESSAGE =
  'Note: Special pages like "chrome-extension://" and "about:" cannot be snoozed.';

export const VIEW_MODES = {
  MAIN_MENU: 'MAIN_MENU',
  CUSTOM: 'CUSTOM',
  RECURRING: 'RECURRING'
};

export const RECURRING_MODES = {
  WEEK: 'WEEK',
  MONTH: 'MONTH'
};

export const PRESETS = [
    // { buttonLabel: 'testing: 1 min', calculateTime: () => Date.now() + 1 * 60_000 },
    { buttonLabel: '1 hour', calculateTime: () => Date.now() + 60 * 60_000 },
    { buttonLabel: '5pm today', calculateTime: () => getTimeForTodayOrTomorrow(17, 0) },
    { buttonLabel: '6am tomorrow', calculateTime: () => getTimeDaysFromNow(6, 0, 1) },
    { buttonLabel: '6am Saturday', calculateTime: () => getTimeForNextDayOfWeek(6, 6, 0) }, // 6 is Saturday
    { buttonLabel: '9am Monday', calculateTime: () => getTimeForNextDayOfWeek(1, 9, 0) }, // 1 is Monday
    { buttonLabel: '30 days', calculateTime: () => getTimeDaysFromNow(6, 0, 30) },
  ];

export const DAYS_OF_WEEK = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
