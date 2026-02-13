# Productivity Suite

A collection of minimal productivity tools designed for focus and clarity.

## 🛠️ Tools

- **[Eisenhower Matrix](eisenhower.html)**: Prioritize tasks by urgency and importance to focus on high-impact goals.
- **[MoSCoW Prioritizer](moscow.html)**: Categorize tasks into Must, Should, Could, and Won't have to manage project scope effectively.
- **[Todo Calendar](todo-calender.html)**: Visualize your month and schedule tasks directly onto a calendar to stay ahead of your deadlines.
- **[Daily Journal](journal.html)**: Capture your thoughts, track your growth, and find clarity with daily entries and history tracking.

## 🚀 Features

- **Dark Mode First**: Sleek, glassmorphic UI designed for concentration.
- **Persistence**: All tasks are saved locally in your browser using **SQLite WASM** with **OPFS** (Origin Private File System) for robust, high-performance storage.
- **Vue.js Powered**: Smooth, reactive interface for efficient task management.

## 💻 Running Locally

To enable the advanced SQLite storage (OPFS), the application requires specific HTTP headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`).

1.  **Start the local server**:
    ```bash
    python server.py
    ```
2.  **Open in Browser**:
    Navigate to [http://localhost:8181](http://localhost:8181)

*Note: Opening the HTML files directly (file://) will not work with the new database system.*

Try me out at https://pranavek.com/productivity

