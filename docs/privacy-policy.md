# Privacy Policy — TabAla

**Effective date:** September 25, 2026

## Summary

TabAla **does not collect, transmit, or share** any personal data. All data is stored locally in the user's browser.

## Data stored

The extension stores the data the user chooses to save and, for suggestions, usage data about those saved links (described in the two sections below):

- **URLs** of tabs saved by the user
- **Titles** of saved pages
- **Favicons** of saved pages
- **Collections** (organization folders created by the user)
- **Workspaces** (groupings of collections)
- **User preferences** (theme, new tab settings)

All data is stored **exclusively** in `chrome.storage.local`, within the user's browser. No data is sent to external servers.

## Topic search (on-device translation)

When the user turns on topic search, the text typed in TabAla's search is translated into English by Chrome's built-in translator, which runs on the user's own computer. Only the search text goes to that local translator; saved links do not. Nothing is sent to external servers. The option is off by default and can be turned off at any time in Settings.

## Now and Focus (suggestions)

To suggest what to open, read or solve next, TabAla keeps on your computer, alongside your links:

- when you completed, snoozed or marked a link as reference, and when you answered "still worth it" in triage;
- how many times and on which days you opened a saved link through TabAla;
- on which days the "Now" section showed each link, and weekly counts (how many were shown, opened, snoozed, discarded);
- while a Focus session runs: its length, when it started and which saved links it plans, so every new tab can follow it. It is erased when the session ends, twelve hours after it started, or with "Clear usage data".

This data stays in `chrome.storage.local`, never leaves the browser and is not included in exports. You can clear it in Settings → Data → "Clear usage data"; your links stay. "Now" can be turned off in Settings.

## Activity on saved links

With "Learn from what I open" on (the default), TabAla also notices, through the `tabs` permission it already uses, when a tab opens a saved link — by any path — and how long it stays active in a focused window (at most 30 minutes per visit). It uses this to ask "completed?" after a long visit, to learn how long each kind of link takes, and to mark the extension icon with a dot on a tab showing a saved link.

- What is stored: for each saved link, how many times and on which days it was opened, the total active time, and whether a "completed?" question is pending.
- What is never stored: addresses that are not saved (they are compared in memory and discarded) and anything from incognito tabs, which are never read.
- Where it stays: only in `chrome.storage.local` and `chrome.storage.session`, in the browser; nothing leaves the computer and nothing goes into exports.
- How to turn it off: Settings → "Learn from what I open". Turning it off stops recording and clears pending questions.
- How to erase it: Settings → Data → "Clear usage data" erases what was learned; your links stay.

## Data not collected

The extension **does not collect**:

- Personally identifiable information
- Browsing history (only URLs that the user explicitly saves)
- Location data
- Financial information
- Authentication credentials
- Content of visited pages

## Permissions used

| Permission | Purpose |
|---|---|
| `storage` | Save and retrieve links, collections, workspaces, and preferences in the browser's local storage |
| `tabs` | Get the URL and title of the active tab, list open tabs, open and close tabs, and recognize when a tab opens a saved link |
| `tabGroups` | Query native tab groups to allow saving tabs from a group as a collection |
| `activeTab` | Securely access only the tab the user is currently viewing |

## Analytics and tracking

The extension **does not use**:

- Google Analytics or any analytics service
- Tracking pixels
- Telemetry
- Third-party cookies
- Remote code (all code is bundled within the extension)

## Third-party sharing

The extension **does not share** data with third parties. No data leaves the user's browser.

## Changes to this policy

Any changes to this policy will be published in this same document, with an updated effective date.

## Contact

For questions about this privacy policy, open an issue in the repository:
https://github.com/vinimlo/tabAla/issues

[Versão em português](./privacy-policy.pt.md)
