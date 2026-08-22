# Privacy Policy for Academic Notes - Snippet Saver

**Last Updated:** August 21, 2026

## 1. Overview
**Academic Notes - Snippet Saver** ("the Extension") is committed to protecting your privacy. This Privacy Policy outlines our data collection, usage, and storage practices. 

Our core philosophy is **Local-First & Zero Telemetry**: your notes, captured academic snippets, metadata, and settings belong entirely to you and reside strictly on your local device.

---

## 2. Information We Collect
The Extension does **NOT** collect, track, transmit, or sell any personal data, browsing history, or analytics.

- **Notes & Snippets**: When you select text and save a snippet, the selected text, user comments, tags, folder paths, and extracted academic metadata (title, author, DOI, URL) are stored **locally** on your device using browser storage (`chrome.storage.local` and SQLite WebAssembly / IndexedDB).
- **No External Servers**: The Extension does not connect to any external tracking, advertising, analytics, or backend cloud servers.
- **No Account Required**: The Extension functions 100% offline without requiring registration, login, or personal identifiers.

---

## 3. Permissions & Why We Need Them
The Extension requests only the minimum permissions necessary for its single purpose:

| Permission | Purpose |
| :--- | :--- |
| **`storage` / `unlimitedStorage`** | Used exclusively to save and persist your academic notes, folders, SQLite database, and user settings locally on your machine. |
| **`contextMenus`** | Adds a convenient right-click menu option ("Save to Academic Notes") when text is selected. |
| **`sidePanel`** | Allows opening the Notes Manager in the browser's side panel for reviewing, organizing, and exporting notes. |
| **`activeTab`** | Enables extracting academic metadata (e.g. title, authors, DOI, journal) from the current webpage only when you explicitly trigger a save action. |
| **`scripting`** | Injects temporary helper scripts to capture metadata and enable the "Force Unlock" selection mode when requested. |
| **`<all_urls>` (Host Permission)** | Allows saving academic quotes and citations from any academic journal, preprint server (arXiv, bioRxiv), scientific database (PubMed, IEEE), or website you browse. |

---

## 4. Data Sharing & Third Parties
- We **do not sell, rent, trade, or share** your data with any third parties.
- The Extension interacts with desktop applications (such as Obsidian, Bear, or Logseq) **only when you explicitly click** a deep-link action (e.g., `obsidian://` or `bear://`), which is handled directly by your operating system.

---

## 5. Data Retention & User Control
- All stored data remains on your local browser profile until you explicitly delete individual notes or click **"Clear All Notes"** in the Options page.
- You can export your complete database at any time in multiple open formats (`.db`, `.json`, `.md`, `.bib`, `.ris`, `.tsv`, `.enw`).
- Uninstalling the Extension completely removes all stored data from your browser.

---

## 6. Children's Privacy
The Extension does not knowingly collect or solicit any personal information from children under the age of 13.

---

## 7. Changes to this Policy
We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.

---

## 8. Contact
If you have any questions or feedback regarding this Privacy Policy, please open an issue on our GitHub repository:
[https://github.com/TrietMinh799/Note-Taking-Manager](https://github.com/TrietMinh799/Note-Taking-Manager)
