# ClientFlow

Streamlining Client Onboarding Workflows in Digital IT Agencies:
An Operational Excellence Perspective

## Version
0.5 - Operational Reports and Backup.

## Technologies
- HTML5
- CSS3
- Vanilla JavaScript
- Browser localStorage

No framework, package installation, build tools, or server required.

## Running
Open index.html using a modern browser.

## Features
### Dashboard
- Total clients
- Active and completed client onboarding
- Client onboarding completion percentage
- Total tasks
- Overdue tasks
- Task completion rate

### Client Management
- Add, edit, and delete clients
- Search and filter clients
- Manage onboarding stages
- Prevent deletion of clients with linked tasks

### Task Management
- Create tasks linked to clients
- Set task owners and deadlines
- Set priority (Low, Medium, High)
- Track status (Not Started, In Progress, Blocked, Completed)
- Edit and delete tasks
- Complete and reopen tasks
- Search and filter tasks
- Overdue task tracking

## Upcoming
- Standard onboarding templates and checklists
- Operational reports
- Data export and import
- GitHub publishing workflow

## Data Storage
Client and task records are stored in browser localStorage.

Source-code backups are stored in .backups and excluded
from future GitHub commits.

Browser records are not included in source-code backups.
Clearing browser website data may erase all records.
Data does not automatically synchronize between devices.

Do not use real customer or sensitive personal data
in this local demonstration application.

## Version 0.4 - Standardized Onboarding Checklists

- Eight predefined onboarding steps
- Generate missing checklist tasks for a selected client
- Prevent duplicate generation of the same template steps
- Suggested owners and priorities
- Due dates calculated from onboarding start date
- Complete or reopen checklist tasks
- Live updates to the Task Management module
- Checklist progress and dashboard metrics
- Existing custom tasks remain unchanged

Template owners are suggested roles, not actual user accounts.
Generated task fields can be edited in Task Management.
Generated task client assignments stay linked to the original client.

## Next planned module
Operational Reports and JSON Data Export / Import.

## Version 0.5 - Operational Reports and Backup
- Reports tab: client onboarding, task status, overdue and blocked work
- Per-client delivery snapshot and completed checklist steps
- Export a complete JSON backup of client and task records
- Export clients and tasks as CSV for spreadsheet analysis
- Restore a validated ClientFlow JSON backup (replaces local browser data)
- Import requires confirmation and offers a pre-import backup download
- Browser data remains local to this browser and file origin
- No extra tools, frameworks, or servers required

## Data safety
Export and save your JSON backup before clearing browser data, switching
computers, moving the project folder, or changing browsers. CSV files do not
contain enough information to restore the application; use JSON for backups.
Neither source backups nor GitHub contain the browser's localStorage records.
