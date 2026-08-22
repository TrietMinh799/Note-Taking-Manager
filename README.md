# 📚 Academic Notes - Snippet Saver

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Local First](https://img.shields.io/badge/Privacy-100%25%20Local--First-success?style=flat-square)](#-privacy--security)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-informational?style=flat-square)](#-built-with)
[![Cross Browser](https://img.shields.io/badge/Browsers-Chrome%20%7C%20Edge%20%7C%20Firefox%20%7C%20Mobile-orange?style=flat-square)](#-installation)

**Academic Notes & Snippet Saver** is a high-performance, lightweight, and privacy-first browser extension designed for students, researchers, academics, and knowledge workers. It enables effortless capture of snippets from research papers, academic journals, and technical documentation, automatically extracting bibliographic metadata and integrating directly with **Obsidian** and **Zotero**.

---

## ✨ Key Features

### 📌 1. Effortless Capture & Floating Quick-Save
- **Highlight to Save**: Simply select text on any webpage to reveal a floating 📌 Save action button.
- **Auto Side Panel**: Automatically slides open your Notes Manager side panel upon saving so you can review and organize notes in real-time.
- **Custom Notes, Tags & Folders**: Add personal annotations, comma-separated tags, and select target folders on the fly.
- **Color Highlighting**: Organize notes visually using 5 distinct color accents (Yellow, Green, Blue, Purple, Orange).

### 🌲 2. File Explorer & Tree Folder System
- **Hierarchical Tree View**: Organize your research into nested folders (e.g. `Research/LLMs/Attention`) with collapsible branches (`▸`/`▾`), folder icons (`📁`/`📂`), and live note counts.
- **Right-Click Context Menu**:
  - ➕ **New Subfolder**: Create nested subfolders anywhere in the tree.
  - 📁 **New Folder**: Create new root categories.
  - 📋 **Copy Path / Name**: Quickly copy folder hierarchy paths to clipboard.
  - ✏️ **Rename Folder**: Cascades renames across all nested notes and subfolders automatically.
  - 🗑️ **Delete Folder**: Safely removes folders while moving notes to `Inbox`.
- **Drag-and-Drop Organizing**: Drag any note card and drop it directly onto any folder in the Explorer tree to relocate it instantly.

### 🔓 3. Anti-Copy Bypass ("Force Unlock" Mode)
- Encountered an academic repository, paywalled library, or site that disables text selection and right-clicking (`user-select: none`, `copy` blocking)?
- Press **`Alt + U`** (or toggle in the popup) to neutralize copy-protection scripts, re-enable standard selection, and capture quotes freely.

### 🏷️ 4. Automated Academic Metadata Extraction
- Reads Highwire Press, Dublin Core, OpenGraph, and standard HTML meta tags in priority order.
- Automatically captures:
  - **Paper / Article Title**
  - **Authors** (e.g., `citation_author`, `DC.creator`)
  - **DOI** (Digital Object Identifier)
  - **Source Domain / Journal**
  - **Timestamp & Direct URL Link**
- Specially tuned for academic sources including *arXiv, PubMed, Nature, IEEE Xplore, ScienceDirect, ACM, Springer, Wiley, MDPI, bioRxiv, PLOS, JSTOR*, and standard web pages.

### 💎 5. Multi-App Export Ecosystem (Obsidian, Notion, Logseq, Bear, Anki & More)
- **Obsidian**:
  - **Callout Format**: Generates standard `> [!quote]` Markdown blocks formatted with page titles and direct links.
  - **YAML Frontmatter**: Includes metadata header (`title`, `authors`, `doi`, `date_saved`, `tags`).
  - **Send via `obsidian://`**: One-click deep link opens directly in your desktop Obsidian vault.
- **Notion**:
  - **Notion Callouts (`> 💡 **Title**`)**: Pastes as native Notion callout blocks with matching color emojis.
  - **Database Properties**: Exports structured property lists (URL, Authors, DOI, Tags, Commentary).
- **Logseq**:
  - **Outliner Blocks & Properties**: Generates block hierarchies with page properties (`title::`, `authors::`, `doi::`, `date::`, `[[wikilinks]]`).
  - **Send via `logseq://`**: Deep link to create and append directly to your Logseq graph.
- **Anki (Spaced Repetition Flashcards)**:
  - **1-Click Card Copy**: Generates formatted Front (Question/Prompt) and Back (Quote + Citation) for quick addition to Anki.
  - **Bulk Deck Export (`.tsv`)**: Export all notes to a Tab-Separated Values file for 1-click Anki Deck import.
- **Bear App**:
  - **Bear Markdown & `#tags`**: Nested `#academic/tag` structure and direct `bear://` create links.
- **Zotero & Academic Reference Managers**:
  - **1-Click BibTeX (`@article` / `@misc`)**: Generates cite keys and formatted BibTeX entries.
  - **1-Click RIS Format**: Generates standardized RIS citation strings (`TY`, `TI`, `AU`, `DO`, `UR`, `N1`).
  - **EndNote & Mendeley (`.enw`)**: Standardized tagged format (`%0`, `%T`, `%A`, `%J`, `%D`, `%U`, `%K`, `%Z`).
- **Rich-Text for Google Docs, Word & OneNote**:
  - **Formatted HTML Copy**: Pastes seamlessly into Google Docs, Microsoft Word, OneNote, or Apple Notes with intact headings, hyperlinks, and blockquotes.
- **Bulk Export & Import**:
  - Download all notes as `.md`, `.tsv` (Anki), `.bib`, `.ris`, `.enw`, `.db` (SQLite), or `.json` files.
  - Full backup and restore capabilities with automatic deduplication.

### 💾 6. SQLite WebAssembly (WASM) Local Database Engine
- **Full Relational SQLite Database**: Powered by WebAssembly SQLite (`sql.js`) with persistent binary storage.
- **Sub-Millisecond Full-Text Search (FTS5)**: Instant search indexing across massive articles and long snippets without UI lag.
- **1-Click `.db` SQLite Export**: Download your full `academic_notes.db` database to open in *DB Browser for SQLite*, *DBeaver*, or analyze via Python scripts (`import sqlite3`).
- **Raw Database Restore**: Import existing `.db` or `.sqlite` files directly into the extension.

### 🖥️ 7. Desktop & Side-Panel Split View Architecture
- **Split-Pane Layout**: The left File Explorer sidebar remains pinned in place while you scroll through notes on the right—no double scrollbars or wasted whitespace.
- **3-Dot Kebab Menu (`⋮`)**: Clean note card headers with integrated dropdown actions for sharing, exporting, editing, and deleting.
- **50-Word Preview & Hover Tooltip**: Card snippets display a clean 50-word preview with an interactive hover tooltip showing the full passage.
- **Full-Text Search & Multi-Filters**: Filter notes instantly by keyword, tags, source domains, or folders.
- **Dark & Light Modes**: Matches your system theme or toggles manually with persistent preference.

### 📄 8. Native PDF Integration & Reader
- Built-in, high-performance Mozilla PDF.js viewer integrated directly within the extension.
- **Offline & Online PDFs**: Open local PDFs from your hard drive or seamlessly transition online PDFs directly into the viewer with a single click from the extension popup.
- **Full Highlighting Support**: The floating Quick-Save menu works natively inside the PDF viewer, allowing you to highlight and save text seamlessly without leaving the document.

### 🖼️ 9. Image & Chart Area Capture
- **Right-Click Screenshot Tool**: Need a specific chart, figure, or mathematical formula? Just Right-Click → "Capture Area to Academic Notes".
- **Interactive Drag-to-Crop**: The screen dims, providing a precision crosshair to drag and crop any visual element.
- **Visual Note Cards**: Captured images are stored natively inside the SQLite database and rendered elegantly on your note cards in the Notes Manager.

---

## 🚀 Installation & Setup

### 📦 1. Clone or Download the Repository

Clone the project to your local machine using Git:

```bash
git clone https://github.com/TrietMinh799/Note-Taking-Manager.git
cd Note-Taking-Manager
```

*(Alternatively, download the repository as a ZIP file and extract it to a folder on your computer.)*

---

### 🟢 2. Google Chrome / Microsoft Edge / Brave / Opera

1. Open your Chromium-based browser and navigate to the Extensions page:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
   - **Opera**: `opera://extensions`
2. Turn ON the **"Developer mode"** toggle (usually located in the top-right corner).
3. Click the **"Load unpacked"** button in the top-left toolbar.
4. In the file dialog, select the project directory (`NoteTakingExtension` or `Note-Taking-Manager`).
5. The extension will appear in your extensions list! Pin it 📌 to your browser toolbar for quick access.

---

### 🦊 3. Mozilla Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **"Load Temporary Add-on..."**.
3. Select the `manifest.json` file inside the cloned directory.
4. The extension is now active in Firefox!

---

### 📱 4. Mobile Browsers (Android)

Compatible with mobile browsers supporting Chromium extensions (e.g., **Kiwi Browser**, **Lemur Browser**, or **Firefox Nightly for Android**):

1. In Kiwi / Lemur, go to Menu (⋮) → **Extensions**.
2. Enable **Developer mode**.
3. Tap **+(from .zip/.crx/.user.js)** or **Load unpacked**, and choose the project directory.
4. The responsive touch interface will adapt automatically to your mobile screen!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Alt + S`** (or `Option + S` on Mac) | Quick Save the currently highlighted text snippet |
| **`Alt + U`** (or `Option + U` on Mac) | Toggle "Force Unlock" mode to bypass copy protections |
| **`Esc`** | Close context menus and modals |

*(Shortcuts can be customized at any time via `chrome://extensions/shortcuts`)*

---

## 📁 Project Directory Structure

```text
NoteTakingExtension/
├── manifest.json              # Extension Manifest V3 configuration
├── README.md                  # Documentation and user guide
├── generate_icons.py          # Script to generate resolution-matched extension icons
├── icons/                     # Extension icons (16x16, 48x48, 128x128)
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── background/
│   └── service-worker.js      # Background worker (storage, sync, context menus, screen capture)
├── content/
│   ├── content.js             # Injected script (selection detection, floating UI, image crop)
│   └── content.css            # Content styles, unlock badge, and screen capture overlay
├── popup/
│   ├── popup.html             # Extension action popup
│   ├── popup.css              # Compact popup styling
│   └── popup.js               # Quick stats, unlock toggle, and Open PDF Reader
├── manager/
│   ├── manager.html           # Full Note Manager & Side Panel UI
│   ├── manager.css            # Split-pane layout, dark mode, tree & card styles
│   └── manager.js             # Explorer tree logic, context menu, search, filtering, CRUD
├── options/
│   ├── options.html           # Settings page (Obsidian vault configuration, data backup)
│   ├── options.css            # Options page layout
│   └── options.js             # Settings persistence & stats
├── lib/
│   ├── sql-wasm.wasm          # SQLite WebAssembly binary
│   ├── sql-wasm.js            # SQLite WASM JS wrapper
│   └── pdfjs/                 # Mozilla PDF.js offline viewer
└── utils/
    ├── storage.js             # Async Chrome Storage wrappers & queries
    ├── metadata.js            # Academic meta-tag scraper & domain detection
    ├── obsidian.js            # Obsidian Markdown callout & URI generator
    └── zotero.js              # BibTeX and RIS citation formatters
```

---

## 🔒 Privacy, Security & Offline-First

- **100% Local Storage**: All notes, folder structures, tags, and settings are saved exclusively on your local device via `chrome.storage.local`.
- **Zero Telemetry**: No analytics, no tracking, and no communication with external servers.
- **Shadow DOM Isolation**: Content script UI elements are rendered inside an isolated Shadow Root to prevent CSS contamination with host web pages.
- **Strict Content Security**: Compliant with Manifest V3 CSP; all scripts are statically bundled with zero unsafe `eval` or remote CDN dependencies.

---

## 📄 License & Academic Disclaimer

This project is open-source under the [MIT License](LICENSE).

*Disclaimer: This extension is a productivity tool for personal study, literature reviews, and research. Users are responsible for adhering to copyright laws, licensing terms of source websites, and proper academic citation standards.*
