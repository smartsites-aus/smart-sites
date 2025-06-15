// Smart Sites - Main Application Controller
class SmartSitesApp {
    constructor() {
        this.currentPage = 'overview';
        this.config = {
            apiBase: '/api'
        };
        
        // Sample data for demonstration
        this.sampleData = {
            totalDevices: 24,
            onlineDevices: 18,
            powerUsage: 1247,
            recentAlerts: 3
        };

        this.init();
    }

    async init() {
        console.log('Initializing Smart Sites application...');
        
        try {
            // Load components
            await this.loadComponents();
            
            // Initialize modules
            this.navigation = new NavigationManager();
            this.dashboard = new DashboardManager();
            this.espHomeBuilder = new ESPHomeBuilder();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial page
            await this.navigation.showPage('overview');
            
            // Start data simulation
            this.startDataSimulation();
            
            console.log('Smart Sites application initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }

    async loadComponents() {
        console.log('Loading UI components...');
        
        try {
            // Load sidebar
            const sidebarResponse = await fetch('components/sidebar.html');
            const sidebarHtml = await sidebarResponse.text();
            document.getElementById('sidebar-container').innerHTML = sidebarHtml;

            // Load widget library
            const widgetLibraryResponse = await fetch('components/widget-library.html');
            const widgetLibraryHtml = await widgetLibraryResponse.text();
            document.getElementById('components-container').innerHTML += widgetLibraryHtml;

            // Load config modal
            const configModalResponse = await fetch('components/config-modal.html');
            const configModalHtml = await configModalResponse.text();
            document.getElementById('components-container').innerHTML += configModalHtml;

            // Load advanced modal
            const advancedModalResponse = await fetch('components/advanced-modal.html');
            const advancedModalHtml = await advancedModalResponse.text();
            document.getElementById('components-container').innerHTML += advancedModalHtml;

            console.log('UI components loaded successfully');
        } catch (error) {
            console.error('Error loading components:', error);
        }
    }

    setupEventListeners() {
        // Close widget library when clicking outside
        document.addEventListener('click', (e) => {
            const library = document.getElementById('widget-library');
            const editBtn = document.getElementById('edit-btn');
            const addWidgetHeaderBtn = document.getElementById('add-widget-header-btn');
            
            if (library && library.classList.contains('open') && !library.contains(e.target)) {
                if (editBtn && (e.target === editBtn || editBtn.contains(e.target))) {
                    return;
                }
                
                if (addWidgetHeaderBtn && (e.target === addWidgetHeaderBtn || addWidgetHeaderBtn.contains(e.target))) {
                    return;
                }
                
                const addWidgetBtns = document.querySelectorAll('.add-widget-btn');
                let clickedAddWidget = false;
                addWidgetBtns.forEach(btn => {
                    if (btn.contains(e.target)) {
                        clickedAddWidget = true;
                    }
                });
                
                if (!clickedAddWidget && this.dashboard) {
                    this.dashboard.hideWidgetLibrary();
                }
            }
        });
    }

    startDataSimulation() {
        // Simulate data updates every 5 seconds
        setInterval(() => {
            if (!this.dashboard || !this.dashboard.editMode || this.currentPage !== 'overview') {
                return;
            }

            try {
                this.sampleData.onlineDevices = Math.floor(Math.random() * 24) + 1;
                this.sampleData.powerUsage = Math.floor(Math.random() * 500) + 1000;
                this.sampleData.recentAlerts = Math.floor(Math.random() * 5);
                
                // Update dashboard widgets
                if (this.dashboard) {
                    this.dashboard.updateWidgetData(this.sampleData);
                }
            } catch (error) {
                console.error('Error updating simulation data:', error);
            }
        }, 5000);
    }

    // Global functions that can be called from HTML
    static getInstance() {
        if (!SmartSitesApp.instance) {
            SmartSitesApp.instance = new SmartSitesApp();
        }
        return SmartSitesApp.instance;
    }
}

// Global function wrappers for backward compatibility
let app;

function showPage(pageId) {
    if (app && app.navigation) {
        app.navigation.showPage(pageId);
    }
}

function toggleEditMode() {
    if (app && app.dashboard) {
        app.dashboard.toggleEditMode();
    }
}

function showWidgetLibrary() {
    if (app && app.dashboard) {
        app.dashboard.showWidgetLibrary();
    }
}

function hideWidgetLibrary() {
    if (app && app.dashboard) {
        app.dashboard.hideWidgetLibrary();
    }
}

function addWidget(widgetType) {
    if (app && app.dashboard) {
        app.dashboard.addWidget(widgetType);
    }
}

function configureWidget(widgetId) {
    if (app && app.dashboard) {
        app.dashboard.configureWidget(widgetId);
    }
}

function deleteWidget(widgetId) {
    if (app && app.dashboard) {
        app.dashboard.deleteWidget(widgetId);
    }
}

function saveWidgetConfig() {
    if (app && app.dashboard) {
        app.dashboard.saveWidgetConfig();
    }
}

function closeConfigModal() {
    if (app && app.dashboard) {
        app.dashboard.closeConfigModal();
    }
}

function filterWidgets(searchTerm) {
    if (app && app.dashboard) {
        app.dashboard.filterWidgets(searchTerm);
    }
}

// ESPHome functions
function showDeviceWizard() {
    if (app && app.espHomeBuilder) {
        app.espHomeBuilder.showDeviceWizard();
    }
}

function showAdvancedMode() {
    if (app && app.espHomeBuilder) {
        app.espHomeBuilder.showAdvancedMode();
    }
}

function closeAdvancedMode() {
    if (app && app.espHomeBuilder) {
        app.espHomeBuilder.closeAdvancedMode();
    }
}

// Placeholder functions for other features
function addDevice() {
    alert('Add device functionality - integrate with ESPHome Builder or add manual device configuration!');
}

function filterDevices() {
    console.log('Filtering devices...');
}

function exportHistory() {
    alert('Export history to CSV - feature coming soon!');
}

function addLocation() {
    const name = prompt('Enter location name:');
    if (name) {
        alert(`Location "${name}" would be added to the system.`);
    }
}

function createAutomation() {
    alert('Automation builder - create smart rules for your construction site!');
}

function addPowerMeter() {
    alert('Add CT clamp for power monitoring - track electrical usage!');
}

function generateReport() {
    alert('Generate construction site reports - export data for compliance!');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = SmartSitesApp.getInstance();
});
