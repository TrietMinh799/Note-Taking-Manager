# Chrome Web Store & Browser Stores Submission Guide

> **Single Source of Truth** for publishing **Academic Notes - Snippet Saver** to the **Chrome Web Store**, **Microsoft Edge Add-ons**, and **Mozilla Firefox Add-ons (AMO)**.

---

## 📋 1. Store Listing Information

### Title / Name
```
Academic Notes - Snippet Saver
```

### Short Summary / Description (Max 132 characters)
```
Capture academic quotes & research snippets. 1-click export to Obsidian, Notion, Logseq, Anki, Zotero, Bear & EndNote with SQLite WASM.
```
*(Character count: 130/132)*

### Category
- **Primary Category:** `Productivity` (or `Workflow & Planning`)
- **Secondary Category:** `Education` / `Academic`

---

## 📝 2. Full Store Description (Formatted for Web Store)

```markdown
Academic Notes - Snippet Saver is the ultimate research companion for students, researchers, academics, and lifelong learners. Effortlessly capture text snippets, extract bibliographic citations automatically, organize in hierarchical folders, and export directly to your favorite knowledge base with 1 click.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ KEY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 1-CLICK SNIPPET SAVING & FLOATING PIN
• Highlight any text passage on any article or paper to reveal the floating 📌 Save button.
• Automatically extracts article title, authors, DOI, journal name, domain, and timestamp.
• Color-code your highlights with 5 visual accents (Yellow, Green, Blue, Purple, Orange).
• Add custom reflections, tags, and organize into nested folders on the fly.

🌲 FULL FILE EXPLORER & TREE FOLDER SYSTEM
• Organize research into nested subfolders (e.g., Research / AI / Transformers).
• Right-click folder context menu: New Subfolder, Rename, Delete, Copy Path.
• Drag-and-drop note cards directly onto any folder in the tree view.
• Filter notes instantly by folder hierarchy.

💎 MULTI-APP EXPORT ECOSYSTEM
• Obsidian: Native callouts (> [!quote]), YAML frontmatter, and 1-click obsidian:// deep links.
• Notion: Native Notion callouts (> 💡 Title) with color emojis and database properties.
• Logseq: Outliner block hierarchies with properties (title::, authors::, doi::) and logseq:// links.
• Anki: Instant Q&A Spaced Repetition flashcards + bulk .tsv Deck export for direct Anki import.
• Bear: Formatted Bear Markdown with nested #academic/tags and bear:// create links.
• Zotero, Mendeley & EndNote: 1-click BibTeX (@article), RIS citation format, and EndNote (.enw).
• Rich-Text Copy: Paste formatted text directly into Google Docs, Word, or OneNote with active links and styling.

💾 LOCAL SQLITE WEBASSEMBLY (WASM) DATABASE
• Powered by a genuine embedded SQLite WASM engine (sql.js) running 100% locally on your machine.
• Sub-millisecond Full-Text Search (FTS5) across massive papers and 100,000+ word notes.
• 1-Click .db SQLite Export: Download your full academic_notes.db file to inspect in DB Browser for SQLite or analyze in Python (import sqlite3).
• 100% Offline, Private, and Zero-Telemetry.

🔓 FORCE UNLOCK ("ANTI-COPY" BYPASS)
• Bypass text selection blockers (user-select: none, disabled right-click) on paywalled or restricted academic portals.
• Toggle easily via Alt + U shortcut or popup button.

🖥️ SPLIT-PANE SIDE PANEL INTERFACE
• Pinned File Explorer sidebar on the left with independent note feed on the right.
• Clean 3-dot kebab menu (⋮) on every note card with quick actions.
• 50-word concise previews with instant full-text hover tooltips.
• Dark and Light theme support.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY & SECURITY FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 100% Local-First: Your notes, snippets, and research data are stored entirely on your device.
• Zero Tracking, Zero Analytics, Zero External Cloud Servers.
• No account registration or login required.
```

---

## 🛡️ 3. Permissions Justifications (Copy-Paste for Reviewers)

When submitting to the **Chrome Web Store Developer Dashboard** under the **Privacy tab**, enter these exact plain-English explanations:

| Permission / Host | Review Justification (Copy & Paste) |
| :--- | :--- |
| **`storage`** | Used to store and persist user-created notes, folders, SQLite database binary state, and extension settings locally on the user's device via chrome.storage.local. |
| **`unlimitedStorage`** | Enables storing thousands of large research papers, extended note excerpts, and binary SQLite database backups without exceeding default browser storage quotas. |
| **`contextMenus`** | Adds a right-click context menu item ('Save to Academic Notes') allowing users to highlight text and quickly save it to their research notebook. |
| **`sidePanel`** | Provides the Notes Manager side panel UI in Chrome, allowing users to view, search, categorize, and export their saved notes side-by-side with web articles. |
| **`activeTab`** | Allows the extension to read bibliographic meta tags (title, author, DOI, publication date, URL) from the active tab only when the user explicitly triggers a save action. |
| **`scripting`** | Injects helper scripts into the active tab to extract academic citation metadata and enable the selection unlock mode when requested by the user. |
| **`<all_urls>` (Host Permission)** | Enables capturing academic quotes, text snippets, and bibliographic metadata across any academic repository, scientific journal, preprint server (e.g. arXiv, PubMed, Nature, IEEE), or website visited by the user. |

---

## 🔒 4. Single Purpose & Data Usage Disclosures

- **Single Purpose Description:**
  ```
  A research productivity tool for capturing academic text snippets from web pages, extracting citation metadata, and organizing notes with local SQLite storage and 1-click export to knowledge base apps.
  ```
- **Data Collection Checkboxes in Developer Dashboard:**
  - [x] **Does your extension collect user data?** -> Select **NO** (all data is stored locally on the client machine; no data is transmitted to external servers).
  - [x] **Certify compliance:** Check all compliance boxes regarding user data privacy.

- **Privacy Policy URL:**
  ```
  https://github.com/TrietMinh799/Note-Taking-Manager/blob/main/PRIVACY_POLICY.md
  ```

---

## 📦 5. Step-by-Step Publishing Guide

### 🟢 A. Chrome Web Store
1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Register a Developer Account (one-time $5 Google fee if you haven't registered before).
3. Click **"New Item"** and upload the `dist/academic-notes-v1.0.0.zip` file.
4. Fill in:
   - **Store Listing:** Paste Title, Short Description, and Full Description from above.
   - **Icons & Screenshots:**
     - Icon 128x128 (`icons/icon-128.png`)
     - At least 1 screenshot (1280x800 px recommended).
   - **Privacy Tab:**
     - Paste Single Purpose.
     - Paste Permission Justifications from the table above.
     - Paste Privacy Policy URL.
5. Click **"Submit for Review"** (typically approved within 24–48 hours).

---

### 🔵 B. Microsoft Edge Add-ons
1. Go to the [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge).
2. Register a Developer Account (100% **FREE**).
3. Click **"Create new extension"** and upload the same `academic-notes-v1.0.0.zip`.
4. Copy-paste the same listing details and permission justifications.
5. Submit for Review (typically approved within 1–3 business days).

---

### 🦊 C. Mozilla Firefox Add-ons (AMO)
1. Go to [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Log in with your Firefox account (100% **FREE**).
3. Click **"Submit a New Add-on"** -> **"On this site"**.
4. Upload `academic-notes-v1.0.0.zip`.
5. Fill in the description and submit for automated/manual review.
