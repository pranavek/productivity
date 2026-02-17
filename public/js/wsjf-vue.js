const { ref, computed, onMounted } = Vue;

Vue.createApp({
    setup() {
        const tasks = ref([]);
        const showModal = ref(false);
        const showCompleted = ref(false);
        const selectedItem = ref(null);

        const defaultItem = () => ({
            text: '',
            description: '',
            type: 'wsjf',
            completed: false,
            createdAt: Date.now(),
            wsjfValue: 5,
            wsjfTimeCriticality: 5,
            wsjfRiskReduction: 5,
            wsjfJobSize: 5
        });

        const loadTasks = async () => {
            const allTasks = await TaskDB.getAll();
            tasks.value = allTasks.filter(t => t.type === 'wsjf');
        };

        const wsjfScore = (item) => {
            const bv = item.wsjfValue || 0;
            const tc = item.wsjfTimeCriticality || 0;
            const rr = item.wsjfRiskReduction || 0;
            const size = item.wsjfJobSize || 0;
            if (size === 0) return null;
            return Math.round(((bv + tc + rr) / size) * 100) / 100;
        };

        const scoreClass = (score) => {
            if (score === null) return '';
            if (score >= 5) return 'wsjf-score-high';
            if (score >= 2) return 'wsjf-score-medium';
            return 'wsjf-score-low';
        };

        const activeTasks = computed(() => {
            return tasks.value
                .filter(t => !t.completed)
                .sort((a, b) => {
                    const sa = wsjfScore(a) ?? -1;
                    const sb = wsjfScore(b) ?? -1;
                    return sb - sa;
                });
        });

        const completedTasks = computed(() => {
            return tasks.value
                .filter(t => t.completed)
                .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
        });

        const totalItems = computed(() => tasks.value.filter(t => !t.completed).length);

        const avgScore = computed(() => {
            const active = activeTasks.value.filter(t => wsjfScore(t) !== null);
            if (active.length === 0) return null;
            const sum = active.reduce((acc, t) => acc + wsjfScore(t), 0);
            return Math.round((sum / active.length) * 100) / 100;
        });

        const topItem = computed(() => {
            return activeTasks.value.find(t => wsjfScore(t) !== null) || null;
        });

        const formulaPreview = computed(() => {
            if (!selectedItem.value) return '';
            const bv = selectedItem.value.wsjfValue || 0;
            const tc = selectedItem.value.wsjfTimeCriticality || 0;
            const rr = selectedItem.value.wsjfRiskReduction || 0;
            const size = selectedItem.value.wsjfJobSize || 0;
            const cod = bv + tc + rr;
            const score = size > 0 ? (cod / size).toFixed(2) : '—';
            return { cod, size, score };
        });

        const openModal = (item = null) => {
            if (item) {
                selectedItem.value = JSON.parse(JSON.stringify(item));
            } else {
                selectedItem.value = defaultItem();
            }
            showModal.value = true;
            setTimeout(() => document.getElementById('wsjf-title-input')?.focus(), 50);
        };

        const closeModal = () => {
            showModal.value = false;
            selectedItem.value = null;
        };

        const saveItem = async () => {
            if (!selectedItem.value.text.trim()) return;

            if (selectedItem.value.id) {
                await TaskDB.update(selectedItem.value);
            } else {
                await TaskDB.add(selectedItem.value);
            }

            closeModal();
            await loadTasks();
        };

        const toggleComplete = async (item) => {
            const updated = JSON.parse(JSON.stringify(item));
            updated.completed = !updated.completed;
            updated.completedAt = updated.completed ? Date.now() : null;
            await TaskDB.update(updated);
            await loadTasks();
        };

        const deleteItem = async (id) => {
            if (!confirm('Delete this item? This action cannot be undone.')) return;
            await TaskDB.delete(id);
            await loadTasks();
        };

        onMounted(loadTasks);

        return {
            tasks,
            showModal,
            showCompleted,
            selectedItem,
            activeTasks,
            completedTasks,
            totalItems,
            avgScore,
            topItem,
            formulaPreview,
            wsjfScore,
            scoreClass,
            openModal,
            closeModal,
            saveItem,
            toggleComplete,
            deleteItem
        };
    },

    template: `
    <main class="notion-main">
        <header class="page-header">
            <div class="header-content">
                <div>
                    <h1>⚖️ WSJF Prioritizer</h1>
                    <p class="subtitle">Weighted Shortest Job First — maximize economic value</p>
                </div>
                <div class="nav-dropdown">
                    <select class="page-selector" onchange="if(this.value) window.location.href=this.value">
                        <option value="/index.html">📅 Calendar</option>
                        <option value="/eisenhower.html">🎯 Eisenhower Matrix</option>
                        <option value="/moscow.html">🏗️ MoSCoW Method</option>
                        <option value="/journal.html">📝 Journal</option>
                        <option value="" selected>⚖️ WSJF</option>
                    </select>
                </div>
            </div>
        </header>

        <!-- Summary Bar -->
        <div class="wsjf-summary-bar">
            <div class="wsjf-summary-stat">
                <span class="wsjf-summary-label">Active Items</span>
                <span class="wsjf-summary-value">{{ totalItems }}</span>
            </div>
            <div class="wsjf-summary-stat" v-if="avgScore !== null">
                <span class="wsjf-summary-label">Avg WSJF</span>
                <span class="wsjf-summary-value">{{ avgScore }}</span>
            </div>
            <div class="wsjf-summary-stat wsjf-summary-top" v-if="topItem">
                <span class="wsjf-summary-label">Top Priority</span>
                <span class="wsjf-summary-value wsjf-summary-top-text">{{ topItem.text }}</span>
            </div>
            <div class="wsjf-summary-actions">
                <button class="primary-btn" @click="openModal()">+ Add Item</button>
            </div>
        </div>

        <!-- Active Items Table -->
        <div class="wsjf-table-container" v-if="activeTasks.length > 0">
            <table class="wsjf-table">
                <thead>
                    <tr>
                        <th class="wsjf-rank">#</th>
                        <th>Item</th>
                        <th class="wsjf-col-score" title="Business Value">BV</th>
                        <th class="wsjf-col-score" title="Time Criticality">TC</th>
                        <th class="wsjf-col-score" title="Risk Reduction / Opportunity Enablement">RR/OE</th>
                        <th class="wsjf-col-score" title="Job Size">Size</th>
                        <th class="wsjf-col-score" title="Cost of Delay = BV + TC + RR">CoD</th>
                        <th class="wsjf-col-score">WSJF</th>
                        <th class="wsjf-col-actions"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in activeTasks" :key="item.id" class="wsjf-row">
                        <td class="wsjf-rank">{{ index + 1 }}</td>
                        <td class="wsjf-item-cell">
                            <span class="wsjf-item-text">{{ item.text }}</span>
                            <span v-if="item.description" class="wsjf-item-desc">{{ item.description }}</span>
                        </td>
                        <td class="wsjf-col-score wsjf-score-num">{{ item.wsjfValue || '—' }}</td>
                        <td class="wsjf-col-score wsjf-score-num">{{ item.wsjfTimeCriticality || '—' }}</td>
                        <td class="wsjf-col-score wsjf-score-num">{{ item.wsjfRiskReduction || '—' }}</td>
                        <td class="wsjf-col-score wsjf-score-num">{{ item.wsjfJobSize || '—' }}</td>
                        <td class="wsjf-col-score wsjf-score-num">{{ (item.wsjfValue||0) + (item.wsjfTimeCriticality||0) + (item.wsjfRiskReduction||0) || '—' }}</td>
                        <td class="wsjf-col-score">
                            <span v-if="wsjfScore(item) !== null" :class="['wsjf-score', scoreClass(wsjfScore(item))]">
                                {{ wsjfScore(item) }}
                            </span>
                            <span v-else class="wsjf-score-na">—</span>
                        </td>
                        <td class="wsjf-col-actions">
                            <div class="wsjf-actions">
                                <button class="wsjf-action-btn" @click="openModal(item)" title="Edit">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button class="wsjf-action-btn wsjf-action-complete" @click="toggleComplete(item)" title="Mark complete">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </button>
                                <button class="wsjf-action-btn wsjf-action-delete" @click="deleteItem(item.id)" title="Delete">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-else class="wsjf-empty">
            <p>No items yet. Add your first item to get started.</p>
        </div>

        <!-- Completed Section -->
        <div class="wsjf-completed-section" v-if="completedTasks.length > 0">
            <button class="wsjf-completed-toggle" @click="showCompleted = !showCompleted">
                <svg :style="{ transform: showCompleted ? 'rotate(90deg)' : 'rotate(0deg)' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                Completed ({{ completedTasks.length }})
            </button>
            <div v-if="showCompleted" class="wsjf-table-container wsjf-completed-table">
                <table class="wsjf-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="wsjf-col-score">BV</th>
                            <th class="wsjf-col-score">TC</th>
                            <th class="wsjf-col-score">RR/OE</th>
                            <th class="wsjf-col-score">Size</th>
                            <th class="wsjf-col-score">WSJF</th>
                            <th class="wsjf-col-actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in completedTasks" :key="item.id" class="wsjf-row wsjf-row-completed">
                            <td class="wsjf-item-cell">
                                <span class="wsjf-item-text wsjf-item-done">{{ item.text }}</span>
                            </td>
                            <td class="wsjf-col-score wsjf-score-num">{{ item.wsjfValue || '—' }}</td>
                            <td class="wsjf-col-score wsjf-score-num">{{ item.wsjfTimeCriticality || '—' }}</td>
                            <td class="wsjf-col-score wsjf-score-num">{{ item.wsjfRiskReduction || '—' }}</td>
                            <td class="wsjf-col-score wsjf-score-num">{{ item.wsjfJobSize || '—' }}</td>
                            <td class="wsjf-col-score">
                                <span v-if="wsjfScore(item) !== null" class="wsjf-score-dimmed">{{ wsjfScore(item) }}</span>
                                <span v-else class="wsjf-score-na">—</span>
                            </td>
                            <td class="wsjf-col-actions">
                                <div class="wsjf-actions">
                                    <button class="wsjf-action-btn" @click="toggleComplete(item)" title="Reopen">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.1"/></svg>
                                    </button>
                                    <button class="wsjf-action-btn wsjf-action-delete" @click="deleteItem(item.id)" title="Delete">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Add/Edit Modal -->
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
            <div class="modal">
                <div class="modal-header">
                    <h2>{{ selectedItem && selectedItem.id ? 'Edit Item' : 'Add Item' }}</h2>
                    <button class="modal-close" @click="closeModal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body" v-if="selectedItem">
                    <div class="form-group">
                        <label class="form-label">Item Name</label>
                        <input id="wsjf-title-input" type="text" class="form-input" v-model="selectedItem.text"
                            @keyup.enter="saveItem" placeholder="What needs to be done?" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description <span class="form-label-optional">(optional)</span></label>
                        <textarea class="form-textarea" v-model="selectedItem.description" rows="2" placeholder="Additional context..."></textarea>
                    </div>
                    <div class="score-inputs-grid">
                        <div class="form-group">
                            <label class="form-label">
                                Business Value
                                <span class="score-hint">How much value does this deliver?</span>
                            </label>
                            <div class="score-input-row">
                                <input type="range" min="1" max="10" v-model.number="selectedItem.wsjfValue" class="score-range">
                                <span class="score-display">{{ selectedItem.wsjfValue }}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Time Criticality
                                <span class="score-hint">How time-sensitive is this?</span>
                            </label>
                            <div class="score-input-row">
                                <input type="range" min="1" max="10" v-model.number="selectedItem.wsjfTimeCriticality" class="score-range">
                                <span class="score-display">{{ selectedItem.wsjfTimeCriticality }}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Risk Reduction / OE
                                <span class="score-hint">What risk does this reduce?</span>
                            </label>
                            <div class="score-input-row">
                                <input type="range" min="1" max="10" v-model.number="selectedItem.wsjfRiskReduction" class="score-range">
                                <span class="score-display">{{ selectedItem.wsjfRiskReduction }}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                Job Size
                                <span class="score-hint">How much effort is required?</span>
                            </label>
                            <div class="score-input-row">
                                <input type="range" min="1" max="10" v-model.number="selectedItem.wsjfJobSize" class="score-range">
                                <span class="score-display">{{ selectedItem.wsjfJobSize }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="formula-preview" v-if="formulaPreview">
                        CoD (BV + TC + RR/OE) = <strong>{{ formulaPreview.cod }}</strong>
                        &nbsp;/&nbsp; Size = <strong>{{ formulaPreview.size }}</strong>
                        &nbsp;→&nbsp; WSJF = <strong>{{ formulaPreview.score }}</strong>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn" @click="closeModal">Cancel</button>
                    <button class="primary-btn" @click="saveItem">
                        {{ selectedItem && selectedItem.id ? 'Save Changes' : 'Add Item' }}
                    </button>
                </div>
            </div>
        </div>
    </main>
    `
}).mount('#app');
