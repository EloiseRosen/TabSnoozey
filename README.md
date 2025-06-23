# TabSnoozey
A Chrome extension that snoozes your tabs until you need them.

## Features

### snooze a tab to a preset time

### snooze a tab to a custom time

### set a recurring snooze (by week or by month)

### snooze a whole window

### view your currently snoozing tabs

### don't miss snoozes
A check for overdue snoozes runs so that you don't miss snoozes that were supposed to open while your computer was shut down, etc.


## Permissions Used
These are the only permissions used:
1. **storage**: locally store the URLs and the times they should be reopened. This data doesn't leave your browser!

2. **alarms**: use the Chrome Alarms API to enable waking up tabs at the right time

3. **tabs**: close the tab when snoozed, and create a new tab with the saved URL at the wake time.

This extension is completely open source! Permissions used can be viewed in the `src/manifest.json` file.

