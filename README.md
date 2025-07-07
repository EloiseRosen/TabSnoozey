# Tab Snoozey
A Chrome extension that "snoozes" tabs, allowing you to close them and have them re-open automatically at a specified time. Tab Snoozey also has functionality to snooze whole windows, as well as set recurring snoozes (e.g. Tuesdays and Thursdays at 9am, or Monthly on the 1st at 5pm).

## Features

### snooze a tab to a preset time
Tab Snoozey comes with a list of presets to allow snoozing to popular times in one click.  
![Tab Snoozey Presets Feature](./src/assets/img/readme/presets.jpg)


### snooze a tab to a custom time
If a preset doesn't match the time you want, select a custom time instead.
![Tab Snoozey Custome Time Feature](./src/assets/img/readme/custom.jpg)

### set a recurring snooze
Recurring snoozes can be set by week or month.
![Tab Snoozey Weekly Recurring Feature](./src/assets/img/readme/recurring-1.jpg)
![Tab Snoozey Monthly Recurring Feature](./src/assets/img/readme/recurring-2.jpg)

### view your currently snoozing tabs
![Tab Snoozey Summary Page](./src/assets/img/readme/summary.jpg)

### snooze a whole window
To snooze a whole window, simply use the toggle at the top.
![Tab Snoozey Window Snooze Feature](./src/assets/img/readme/window.jpg)

### don't miss snoozes
A check for overdue snoozes runs so that you don't miss any tabs that were supposed to open while your computer was shut down, etc.

## Permissions Used
These are the only permissions used:
1. **storage**: locally store the URLs and the times they should be reopened. This data doesn't leave your browser!

2. **alarms**: use the Chrome Alarms API to enable waking up tabs at the right time

3. **tabs**: close the tab when snoozed, and create a new tab with the saved URL at the wake time.

This extension is completely open source! Permissions used can be viewed in the `src/manifest.json` file.

