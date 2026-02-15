/**
 * Notion-Style Sidebar Component
 * Provides navigation between tools with collapsible sections and task statistics
 */

function createSidebarComponent(currentPage) {
    return {
        data() {
            return {
                page: currentPage,
                collapsed: false,
                sectionsExpanded: {
                    matrices: true
                },
                totalTasks: 0,
                completedTasks: 0
            };
        },

        async mounted() {
            await this.loadTaskStats();
            this.setActivePage();

            // Add mobile menu toggle
            this.setupMobileMenu();
        },

        methods: {
            toggleSidebar() {
                this.collapsed = !this.collapsed;
                const sidebar = document.querySelector('.notion-sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                }
            },

            toggleSection(key) {
                this.sectionsExpanded[key] = !this.sectionsExpanded[key];
            },

            async loadTaskStats() {
                try {
                    const tasks = await TaskDB.getAll();
                    this.totalTasks = tasks.length;
                    this.completedTasks = tasks.filter(t => t.completed || t.status === 'completed').length;
                } catch (error) {
                    console.error('Failed to load task stats:', error);
                }
            },

            setActivePage() {
                // Set active class based on current page
                const path = window.location.pathname;
                if (path.includes('eisenhower')) {
                    this.page = 'eisenhower';
                } else if (path.includes('moscow')) {
                    this.page = 'moscow';
                } else if (path.includes('journal')) {
                    this.page = 'journal';
                } else {
                    this.page = 'calendar';
                }
            },

            setupMobileMenu() {
                // Create mobile toggle button if it doesn't exist
                const existingToggle = document.querySelector('.mobile-menu-toggle');
                if (!existingToggle) {
                    const toggle = document.createElement('button');
                    toggle.className = 'mobile-menu-toggle';
                    toggle.innerHTML = '☰';
                    toggle.addEventListener('click', () => {
                        const sidebar = document.querySelector('.notion-sidebar');
                        if (sidebar) {
                            sidebar.classList.toggle('open');
                        }
                    });
                    document.body.appendChild(toggle);
                }

                // Close sidebar when clicking outside on mobile
                document.addEventListener('click', (e) => {
                    const sidebar = document.querySelector('.notion-sidebar');
                    const toggle = document.querySelector('.mobile-menu-toggle');
                    if (window.innerWidth <= 768 && sidebar &&
                        !sidebar.contains(e.target) &&
                        !toggle.contains(e.target) &&
                        sidebar.classList.contains('open')) {
                        sidebar.classList.remove('open');
                    }
                });
            }
        },

        template: `
            <aside class="notion-sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h2 class="sidebar-title">Productivity Suite</h2>
                    <button class="sidebar-toggle" @click="toggleSidebar" title="Toggle sidebar">
                        {{ collapsed ? '→' : '←' }}
                    </button>
                </div>

                <nav class="sidebar-nav">
                    <a href="/index.html" class="nav-item" :class="{active: page === 'calendar'}">
                        <span class="nav-icon">📅</span>
                        <span class="nav-label">Calendar</span>
                    </a>

                    <div class="nav-section">
                        <div class="section-header" @click="toggleSection('matrices')">
                            <span class="section-icon">📊</span>
                            <span class="section-label">Priority Matrices</span>
                            <button class="section-toggle" :class="{expanded: sectionsExpanded.matrices}">
                                ▼
                            </button>
                        </div>
                        <div class="section-content" :class="{collapsed: !sectionsExpanded.matrices}">
                            <a href="/eisenhower.html" class="nav-item" :class="{active: page === 'eisenhower'}">
                                <span class="nav-icon">🎯</span>
                                <span class="nav-label">Eisenhower Matrix</span>
                            </a>
                            <a href="/moscow.html" class="nav-item" :class="{active: page === 'moscow'}">
                                <span class="nav-icon">🏗️</span>
                                <span class="nav-label">MoSCoW Method</span>
                            </a>
                        </div>
                    </div>

                    <a href="/journal.html" class="nav-item" :class="{active: page === 'journal'}">
                        <span class="nav-icon">📝</span>
                        <span class="nav-label">Journal</span>
                    </a>
                </nav>

                <div class="sidebar-footer">
                    <div class="task-stats">
                        <div>📊 {{ totalTasks }} total tasks</div>
                        <div>✅ {{ completedTasks }} completed</div>
                    </div>
                </div>
            </aside>
        `
    };
}
