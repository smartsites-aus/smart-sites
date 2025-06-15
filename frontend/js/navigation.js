// Navigation Manager
class NavigationManager {
    constructor() {
        this.currentPage = 'overview';
        this.pages = [
            'overview', 'devices', 'history', 'locations', 
            'automations', 'esphome', 'power', 'reports'
        ];
    }

    async showPage(pageId) {
        console.log('Switching to page:', pageId);
        
        // Exit edit mode if switching pages
        if (app && app.dashboard && app.dashboard.editMode) {
            app.dashboard.exitEditMode();
        }
        
        try {
            // Load page content
            await this.loadPageContent(pageId);
            
            // Update navigation state
            this.updateNavigation(pageId);
            
            // Update current page
            this.currentPage = pageId;
            if (app) {
                app.currentPage = pageId;
            }
            
            // Load page-specific data
            await this.loadPageData(pageId);
            
        } catch (error) {
            console.error('Error switching pages:', error);
        }
    }

    async loadPageContent(pageId) {
        try {
            // Hide all existing page content
            const pageContainer = document.getElementById('page-container');
            
            // Load the new page content
            const response = await fetch(`pages/${pageId}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${pageId}`);
            }
            
            const pageHtml = await response.text();
            pageContainer.innerHTML = pageHtml;
            
            console.log(`Page ${pageId} loaded successfully`);
        } catch (error) {
            console.error(`Error loading page ${pageId}:`, error);
            // Show error page or fallback content
            document.getElementById('page-container').innerHTML = `
                <div class="page-content active">
                    <div class="page-header">
                        <h1 class="page-title">Error</h1>
                    </div>
                    <div class="card">
                        <div class="card-content">
                            <p>Failed to load page: ${pageId}</p>
                            <p>Please try again or contact support.</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateNavigation(pageId) {
        // Update active nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Find and activate the correct nav link
        const activeLink = Array.from(navLinks).find(link => 
            link.textContent.trim().toLowerCase().includes(pageId) ||
            (pageId === 'overview' && link.textContent.includes('Overview'))
        );
        
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    async loadPageData(pageId) {
        console.log('Loading data for page:', pageId);
        
        switch (pageId) {
            case 'overview':
                // Dashboard functionality is handled by DashboardManager
                if (app && app.dashboard) {
                    app.dashboard.renderDashboard();
                }
                break;
            case 'devices':
                await this.loadDevices();
                break;
            case 'history':
                await this.loadHistory();
                break;
            case 'locations':
                await this.loadLocations();
                break;
            case 'automations':
                await this.loadAutomations();
                break;
            case 'esphome':
                await this.loadESPHomeData();
                break;
            case 'power':
                await this.loadPowerData();
                break;
            case 'reports':
                console.log('Reports page loaded');
                break;
            default:
                console.log('Unknown page:', pageId);
        }
    }

    async loadDevices() {
        console.log('Loading devices...');
        // TODO: Implement device loading
        // This would fetch from /api/devices
    }

    async loadHistory() {
        console.log('Loading history...');
        // TODO: Implement history loading
        // This would fetch from /api/history
    }

    async loadLocations() {
        console.log('Loading locations...');
        // TODO: Implement locations loading
        // This would fetch from /api/locations
    }

    async loadAutomations() {
        console.log('Loading automations...');
        // TODO: Implement automations loading
        // This would fetch from /api/automations
    }

    async loadESPHomeData() {
        console.log('Loading ESPHome page');
        if (app && app.espHomeBuilder) {
            await app.espHomeBuilder.loadDevices();
        }
    }

    async loadPowerData() {
        console.log('Loading power data...');
        // TODO: Implement power data loading
        // This would fetch from /api/power-consumption
    }
}
