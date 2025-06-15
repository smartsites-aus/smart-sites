// Dashboard Manager
class DashboardManager {
    constructor() {
        this.editMode = false;
        this.dashboardConfig = {
            widgets: []
        };
        this.draggedWidget = null;
        this.currentConfigWidget = null;
        
        // Widget templates
        this.widgetTemplates = {
            'total-devices': {
                name: 'Total Devices',
                type: 'stat',
                icon: '📱',
                data: () => app.sampleData.totalDevices,
                configurable: true
            },
            'online-devices': {
                name: 'Online Devices',
                type: 'stat',
                icon: '🟢',
                data: () => app.sampleData.onlineDevices,
                configurable: true
            },
            'power-usage': {
                name: 'Power Usage',
                type: 'stat',
                icon: '⚡',
                data: () => app.sampleData.powerUsage + 'W',
                configurable: true
            },
            'alerts': {
                name: 'Recent Alerts',
                type: 'stat',
                icon: '🚨',
                data: () => app.sampleData.recentAlerts,
                configurable: true
            },
            'device-status-chart': {
                name: 'Device Status Distribution',
                type: 'chart',
                icon: '📊',
                configurable: true
            },
            'power-trend': {
                name: 'Power Usage Trend',
                type: 'chart',
                icon: '📈',
                configurable: true
            },
            'temperature-chart': {
                name: 'Temperature Monitoring',
                type: 'chart',
                icon: '🌡️',
                configurable: true
            },
            'air-quality': {
                name: 'Air Quality Index',
                type: 'chart',
                icon: '🌬️',
                configurable: true
            },
            'recent-activity': {
                name: 'Recent Activity Feed',
                type: 'list',
                icon: '📋',
                configurable: true
            },
            'location-status': {
                name: 'Location Status Overview',
                type: 'grid',
                icon: '📍',
                configurable: true
            },
            'noise-levels': {
                name: 'Noise Level Monitor',
                type: 'gauge',
                icon: '🔊',
                configurable: true
            },
            'weather': {
                name: 'Weather Conditions',
                type: 'weather',
                icon: '🌤️',
                configurable: true
            }
        };
        
        this.init();
    }

    init() {
        this.setupDragAndDrop();
        this.renderDashboard();
    }

    // Toggle edit mode (only works on Overview page)
    toggleEditMode() {
        if (app.currentPage !== 'overview') {
            alert('Dashboard editing is only available on the Overview page.');
            return;
        }

        const editBtn = document.getElementById('edit-btn');
        const dashboardGrid = document.getElementById('dashboard-grid');
        const headerActions = document.querySelector('.header-actions');

        if (!this.editMode) {
            // Enter edit mode
            this.editMode = true;
            editBtn.innerHTML = '<span>💾</span><span>Save Dashboard</span>';
            editBtn.classList.add('save-mode');
            dashboardGrid.classList.add('edit-mode');
            
            // Remove any existing edit mode buttons first
            const existingAddBtn = document.getElementById('add-widget-header-btn');
            const existingCancelBtn = document.getElementById('cancel-btn');
            if (existingAddBtn) existingAddBtn.remove();
            if (existingCancelBtn) existingCancelBtn.remove();
            
            // Add + button for adding widgets
            const addWidgetBtn = document.createElement('button');
            addWidgetBtn.className = 'add-widget-header-btn';
            addWidgetBtn.innerHTML = '<span>➕</span><span>Add Widget</span>';
            addWidgetBtn.onclick = () => this.showWidgetLibrary();
            addWidgetBtn.id = 'add-widget-header-btn';
            headerActions.appendChild(addWidgetBtn);
            
            // Add cancel button
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-btn';
            cancelBtn.innerHTML = '<span>✖️</span><span>Cancel</span>';
            cancelBtn.onclick = () => this.cancelEdit();
            cancelBtn.id = 'cancel-btn';
            headerActions.appendChild(cancelBtn);

            // Show widget library initially
            this.showWidgetLibrary();
            
            // Remove welcome card if it exists
            const welcomeCard = document.getElementById('welcome-card');
            if (welcomeCard) {
                welcomeCard.style.display = 'none';
            }
        } else {
            // Exit edit mode - save changes
            this.saveDashboard();
        }
    }

    // Cancel edit mode
    cancelEdit() {
        this.editMode = false;
        this.renderDashboard();
        this.exitEditMode();
    }

    // Exit edit mode UI
    exitEditMode() {
        const editBtn = document.getElementById('edit-btn');
        const dashboardGrid = document.getElementById('dashboard-grid');
        const cancelBtn = document.getElementById('cancel-btn');
        const addWidgetBtn = document.getElementById('add-widget-header-btn');

        this.editMode = false;
        
        if (editBtn && app.currentPage === 'overview') {
            editBtn.innerHTML = '<span>✏️</span><span>Edit Dashboard</span>';
            editBtn.classList.remove('save-mode');
        }
        
        if (dashboardGrid) {
            dashboardGrid.classList.remove('edit-mode');
        }
        
        if (cancelBtn) cancelBtn.remove();
        if (addWidgetBtn) addWidgetBtn.remove();

        this.hideWidgetLibrary();
        
        if (this.dashboardConfig.widgets.length === 0) {
            this.renderDashboard();
        }
    }

    // Show/hide widget library
    showWidgetLibrary() {
        const library = document.getElementById('widget-library');
        if (library) {
            library.classList.add('open');
            
            setTimeout(() => {
                const searchInput = library.querySelector('.library-search');
                if (searchInput) {
                    searchInput.focus();
                }
            }, 300);
        }
    }

    hideWidgetLibrary() {
        const library = document.getElementById('widget-library');
        if (library) {
            library.classList.remove('open');
        }
    }

    // Add widget to dashboard
    addWidget(widgetType) {
        const widget = {
            id: 'widget_' + Date.now(),
            type: widgetType,
            config: {
                title: this.widgetTemplates[widgetType].name,
                refreshInterval: 30000
            }
        };

        this.dashboardConfig.widgets.push(widget);
        this.renderWidget(widget);

        const welcomeCard = document.getElementById('welcome-card');
        if (welcomeCard) {
            welcomeCard.remove();
        }

        this.hideWidgetLibrary();
    }

    // Render dashboard
    renderDashboard() {
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;
        
        const existingWidgets = grid.querySelectorAll('.widget-card');
        existingWidgets.forEach(widget => widget.remove());

        if (this.dashboardConfig.widgets.length === 0) {
            const existingWelcome = document.getElementById('welcome-card');
            if (!existingWelcome) {
                const welcomeCard = document.createElement('div');
                welcomeCard.className = 'welcome-card';
                welcomeCard.id = 'welcome-card';
                welcomeCard.innerHTML = `
                    <h2 class="welcome-title">Welcome to Smart Sites</h2>
                    <p class="welcome-text">Customize your dashboard by adding widgets that matter most to your construction site operations.</p>
                    <div class="welcome-actions">
                        <button class="add-widget-btn" onclick="showWidgetLibrary()">
                            <span>➕</span>
                            <span>Add Your First Widget</span>
                        </button>
                    </div>
                `;
                grid.appendChild(welcomeCard);
            } else {
                existingWelcome.style.display = 'block';
            }
        } else {
            const welcomeCard = document.getElementById('welcome-card');
            if (welcomeCard) {
                welcomeCard.style.display = 'none';
            }
            
            this.dashboardConfig.widgets.forEach(widget => {
                try {
                    this.renderWidget(widget);
                } catch (error) {
                    console.error('Error rendering widget:', widget.id, error);
                }
            });
        }
    }

    // Render individual widget
    renderWidget(widget) {
        const template = this.widgetTemplates[widget.type];
        if (!template) return;

        const widgetElement = document.createElement('div');
        widgetElement.className = 'widget-card';
        widgetElement.id = widget.id;
        widgetElement.draggable = true;

        const controls = `
            <div class="widget-controls">
                <button class="widget-control-btn configure-btn" onclick="app.dashboard.configureWidget('${widget.id}')" title="Configure">
                    ⚙️
                </button>
                <button class="widget-control-btn delete-btn" onclick="app.dashboard.deleteWidget('${widget.id}')" title="Delete">
                    🗑️
                </button>
            </div>
        `;

        let content = '';
        switch (template.type) {
            case 'stat':
                content = `
                    <div class="stat-card">
                        <div class="stat-value">${template.data()}</div>
                        <div class="stat-label">${widget.config.title}</div>
                    </div>
                `;
                break;
            case 'chart':
                content = `
                    <div class="chart-card">
                        <div class="chart-title">${widget.config.title}</div>
                        <div class="chart-placeholder">Chart: ${template.name}</div>
                    </div>
                `;
                break;
            default:
                content = `
                    <div class="chart-card">
                        <div class="chart-title">${widget.config.title}</div>
                        <div class="chart-placeholder">${template.name}</div>
                    </div>
                `;
        }

        widgetElement.innerHTML = controls + content;

        widgetElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
        widgetElement.addEventListener('dragend', (e) => this.handleDragEnd(e));

        const grid = document.getElementById('dashboard-grid');
        if (grid) {
            grid.appendChild(widgetElement);
        }
    }

    // Configure widget
    configureWidget(widgetId) {
        const widget = this.dashboardConfig.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        this.currentConfigWidget = widget;
        const template = this.widgetTemplates[widget.type];

        document.getElementById('config-title').textContent = `Configure ${template.name}`;
        
        const configBody = document.getElementById('config-body');
        configBody.innerHTML = `
            <div class="config-group">
                <label class="config-label">Widget Title</label>
                <input type="text" class="config-input" id="widget-title" value="${widget.config.title}">
            </div>
            <div class="config-group">
                <label class="config-label">Refresh Interval (seconds)</label>
                <input type="number" class="config-input" id="refresh-interval" value="${widget.config.refreshInterval / 1000}" min="5" max="300">
            </div>
        `;

        document.getElementById('config-modal').classList.add('open');
    }

    // Save widget configuration
    saveWidgetConfig() {
        if (!this.currentConfigWidget) return;

        const title = document.getElementById('widget-title').value;
        const refreshInterval = parseInt(document.getElementById('refresh-interval').value) * 1000;

        this.currentConfigWidget.config.title = title;
        this.currentConfigWidget.config.refreshInterval = refreshInterval;

        this.renderDashboard();
        this.closeConfigModal();
    }

    // Close configuration modal
    closeConfigModal() {
        document.getElementById('config-modal').classList.remove('open');
        this.currentConfigWidget = null;
    }

    // Delete widget
    deleteWidget(widgetId) {
        if (confirm('Are you sure you want to delete this widget?')) {
            this.dashboardConfig.widgets = this.dashboardConfig.widgets.filter(w => w.id !== widgetId);
            const widgetElement = document.getElementById(widgetId);
            if (widgetElement) {
                widgetElement.remove();
            }
            
            if (this.dashboardConfig.widgets.length === 0) {
                this.renderDashboard();
            }
        }
    }

    // Drag and drop handlers
    handleDragStart(e) {
        if (!this.editMode) return;
        
        this.draggedWidget = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedWidget = null;
    }

    // Setup drag and drop for dashboard grid
    setupDragAndDrop() {
        // Wait for grid to be available
        setTimeout(() => {
            const grid = document.getElementById('dashboard-grid');
            if (!grid) return;
            
            grid.addEventListener('dragover', (e) => {
                if (!this.editMode || !this.draggedWidget) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                grid.classList.add('drag-over');
            });

            grid.addEventListener('dragleave', () => {
                grid.classList.remove('drag-over');
            });

            grid.addEventListener('drop', (e) => {
                e.preventDefault();
                grid.classList.remove('drag-over');
                
                if (!this.editMode || !this.draggedWidget) return;
                
                const afterElement = this.getDragAfterElement(grid, e.clientY);
                if (afterElement == null) {
                    grid.appendChild(this.draggedWidget);
                } else {
                    grid.insertBefore(this.draggedWidget, afterElement);
                }
            });
        }, 1000);
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.widget-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Save dashboard configuration
    saveDashboard() {
        console.log('Saving dashboard configuration:', this.dashboardConfig);
        
        const editBtn = document.getElementById('edit-btn');
        const originalText = editBtn.innerHTML;
        editBtn.innerHTML = '<span>✅</span><span>Saved!</span>';
        editBtn.disabled = true;
        
        setTimeout(() => {
            console.log('Save completed, exiting edit mode');
            editBtn.innerHTML = originalText;
            editBtn.disabled = false;
            this.exitEditMode();
        }, 1000);
    }

    // Filter widgets in library
    filterWidgets(searchTerm) {
        const widgets = document.querySelectorAll('.library-widget');
        searchTerm = searchTerm.toLowerCase();
        
        widgets.forEach(widget => {
            const name = widget.querySelector('.library-widget-name').textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                widget.style.display = 'block';
            } else {
                widget.style.display = 'none';
            }
        });
    }

    // Update widget data
    updateWidgetData(sampleData) {
        this.dashboardConfig.widgets.forEach(widget => {
            try {
                if (this.widgetTemplates[widget.type] && this.widgetTemplates[widget.type].type === 'stat') {
                    const element = document.getElementById(widget.id);
                    if (element) {
                        const statValue = element.querySelector('.stat-value');
                        if (statValue) {
                            statValue.textContent = this.widgetTemplates[widget.type].data();
                        }
                    }
                }
            } catch (widgetError) {
                console.warn('Error updating widget:', widget.id, widgetError);
            }
        });
    }
}
