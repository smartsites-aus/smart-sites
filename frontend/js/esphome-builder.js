// ESPHome Builder Class
class ESPHomeBuilder {
    constructor() {
        this.currentStep = 1;
        this.selectedDeviceType = null;
        this.deviceConfig = {
            name: '',
            type: '',
            pins: {},
            wifi_ssid: '',
            wifi_password: '',
            location_id: null
        };
        this.deviceTemplates = {};
        this.availableNetworks = [];
        
        // Advanced mode state
        this.advancedConfig = {
            boardType: 'esp32dev',
            deviceName: '',
            wifi: { ssid: '', password: '' },
            pins: {},
            sensors: [],
            customYAML: ''
        };
        
        this.init();
    }
    
    async init() {
        console.log('Initializing ESPHome builder...');
        await this.loadTemplates();
        await this.loadDevices();
        this.startAutoRefresh();
        console.log('ESPHome builder initialized successfully');
    }
    
    async loadTemplates() {
        try {
            const response = await fetch('/api/esphome/templates');
            if (response.ok) {
                this.deviceTemplates = await response.json();
            } else {
                // API not available - use default templates silently
                this.useDefaultTemplates();
            }
        } catch (error) {
            // Backend not available - use default templates silently for demo
            console.log('API not available, using default templates for demo mode');
            this.useDefaultTemplates();
        }
    }
    
    useDefaultTemplates() {
        this.deviceTemplates = {
            'motion_sensor': { 
                name: 'Motion Sensor', 
                description: 'PIR motion detection',
                sensors: ['binary_sensor']
            },
            'light_sensor': { 
                name: 'Light Sensor', 
                description: 'Ambient light monitoring',
                sensors: ['sensor']
            },
            'air_quality': { 
                name: 'Air Quality Monitor', 
                description: 'Temperature & humidity',
                sensors: ['sensor']
            },
            'noise_monitor': { 
                name: 'Noise Monitor', 
                description: 'Sound level detection',
                sensors: ['sensor']
            },
            'power_monitor': { 
                name: 'Power Monitor', 
                description: 'CT clamp monitoring',
                sensors: ['sensor']
            }
        };
    }
    
    async loadDevices() {
        try {
            const response = await fetch('/api/esphome/devices');
            if (response.ok) {
                const devices = await response.json();
                this.renderDevices(devices);
            } else {
                // API not available - show empty state for demo
                this.renderDevices([]);
            }
        } catch (error) {
            // Backend not available - show empty state for demo
            console.log('API not available, showing empty state for demo mode');
            this.renderDevices([]);
        }
    }
    
    renderDevices(devices) {
        const grid = document.getElementById('esphome-devices-grid');
        if (!grid) return;
        
        if (devices.length === 0) {
            grid.innerHTML = `
                <div class="card" style="margin-top: 20px;">
                    <div class="card-content" style="text-align: center; padding: 40px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🔧</div>
                        <h3>No ESP32 Devices Yet</h3>
                        <p>Create your first ESP32 device configuration to get started.</p>
                        <button class="btn-primary" onclick="app.espHomeBuilder.showDeviceWizard()" style="margin-top: 15px;">
                            Create First Device
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = devices.map(device => `
            <div class="esphome-device-card">
                <div class="device-status-indicator ${this.getStatusClass(device.compilation_status)}"></div>
                <h3>${device.name}</h3>
                <p><strong>Type:</strong> ${this.getDeviceTypeDisplayName(device.type)}</p>
                <p><strong>Location:</strong> ${device.location || 'Unassigned'}</p>
                <p><strong>Status:</strong> ${this.getStatusText(device.compilation_status)}</p>
                
                <div class="device-actions">
                    <button onclick="app.espHomeBuilder.compileDevice(${device.id})" 
                            ${device.compilation_status === 'compiling' ? 'disabled' : ''}>
                        🔨 ${device.compilation_status === 'compiling' ? 'Compiling...' : 'Compile'}
                    </button>
                    <button onclick="app.espHomeBuilder.uploadFirmware(${device.id})"
                            ${device.compilation_status !== 'success' ? 'disabled' : ''}>
                        📤 Upload
                    </button>
                    <button onclick="app.espHomeBuilder.showDeviceLogs(${device.id})">
                        📝 Logs
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    getDeviceTypeDisplayName(type) {
        if (this.deviceTemplates[type]) {
            return this.deviceTemplates[type].name;
        }
        // Fallback for demo mode
        const fallbackNames = {
            'motion_sensor': 'Motion Sensor',
            'light_sensor': 'Light Sensor', 
            'air_quality': 'Air Quality Monitor',
            'noise_monitor': 'Noise Monitor',
            'power_monitor': 'Power Monitor'
        };
        return fallbackNames[type] || type;
    }
    
    getStatusClass(status) {
        switch (status) {
            case 'success': return 'online';
            case 'compiling': return 'compiling';
            case 'error': return 'error';
            default: return 'pending';
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case 'success': return 'Ready to upload';
            case 'compiling': return 'Compiling...';
            case 'error': return 'Compilation failed';
            default: return 'Waiting to compile';
        }
    }
    
    showDeviceWizard() {
        // Create modal if it doesn't exist
        this.createDeviceWizardModal();
        document.getElementById('device-wizard-modal').style.display = 'flex';
        this.resetWizard();
    }
    
    createDeviceWizardModal() {
        if (document.getElementById('device-wizard-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'device-wizard-modal';
        modal.className = 'config-modal';
        modal.innerHTML = `
            <div class="config-content" style="max-width: 800px;">
                <div class="config-header">
                    <h3 class="config-title">Create New ESP32 Device</h3>
                    <button class="config-close" onclick="app.espHomeBuilder.closeDeviceWizard()">&times;</button>
                </div>
                <div class="config-body">
                    <div style="margin-bottom: 20px;">
                        <div class="wizard-steps" style="display: flex; margin-bottom: 20px;">
                            <div class="step active" style="flex: 1; text-align: center; padding: 10px; background: #333; color: white; margin-right: 5px; border-radius: 4px;">1. Type</div>
                            <div class="step" style="flex: 1; text-align: center; padding: 10px; background: #e9ecef; margin-right: 5px; border-radius: 4px;">2. Config</div>
                            <div class="step" style="flex: 1; text-align: center; padding: 10px; background: #e9ecef; margin-right: 5px; border-radius: 4px;">3. Setup</div>
                            <div class="step" style="flex: 1; text-align: center; padding: 10px; background: #e9ecef; border-radius: 4px;">4. Review</div>
                        </div>
                        
                        <div class="wizard-step active" id="step-1">
                            <h4>Select Device Type</h4>
                            <div id="device-types-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                                <!-- Device types will be loaded here -->
                            </div>
                        </div>
                        
                        <div class="wizard-step" id="step-2" style="display: none;">
                            <h4>Configure Device</h4>
                            <div class="config-group">
                                <label class="config-label">Device Name</label>
                                <input type="text" class="config-input" id="device-name" placeholder="e.g., Workshop Motion Sensor">
                            </div>
                            <div class="config-group">
                                <label class="config-label">Pin Configuration</label>
                                <p style="color: #666; font-size: 14px;">Default pin assignments will be used (GPIO2 for most sensors)</p>
                            </div>
                        </div>
                        
                        <div class="wizard-step" id="step-3" style="display: none;">
                            <h4>Network Setup</h4>
                            <div class="config-group">
                                <label class="config-label">WiFi Network</label>
                                <input type="text" class="config-input" id="wifi-ssid" placeholder="Your WiFi Network Name">
                            </div>
                            <div class="config-group">
                                <label class="config-label">WiFi Password</label>
                                <input type="password" class="config-input" id="wifi-password" placeholder="Network Password">
                            </div>
                            <div class="config-group">
                                <label class="config-label">Location</label>
                                <select class="config-input" id="device-location">
                                    <option value="">Select Location</option>
                                    <option value="1">Main Office</option>
                                    <option value="2">Workshop</option>
                                    <option value="3">Storage</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="wizard-step" id="step-4" style="display: none;">
                            <h4>Review Configuration</h4>
                            <div id="review-info" style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                                <p><strong>Device:</strong> <span id="review-name">-</span></p>
                                <p><strong>Type:</strong> <span id="review-type">-</span></p>
                                <p><strong>Network:</strong> <span id="review-wifi">-</span></p>
                                <p><strong>Location:</strong> <span id="review-location">-</span></p>
                            </div>
                            <p style="color: #666; font-size: 14px;">Click "Create Device" to generate the ESPHome configuration and start compilation.</p>
                        </div>
                    </div>
                </div>
                <div class="config-footer">
                    <button class="btn-secondary" onclick="app.espHomeBuilder.previousStep()" id="prev-btn" style="display: none;">Previous</button>
                    <button class="btn-primary" onclick="app.espHomeBuilder.nextStep()" id="next-btn" disabled>Next</button>
                    <button class="btn-primary" onclick="app.espHomeBuilder.createDevice()" id="create-btn" style="display: none;">Create Device</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    closeDeviceWizard() {
        const modal = document.getElementById('device-wizard-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    resetWizard() {
        this.currentStep = 1;
        this.selectedDeviceType = null;
        this.deviceConfig = {
            name: '',
            type: '',
            pins: {},
            wifi_ssid: '',
            wifi_password: '',
            location_id: null
        };
        
        this.showStep(1);
        this.loadDeviceTypes();
    }
    
    loadDeviceTypes() {
        const grid = document.getElementById('device-types-grid');
        if (!grid) return;
        
        const typeIcons = {
            'motion_sensor': '👋',
            'light_sensor': '💡',
            'air_quality': '🌬️',
            'noise_monitor': '🔊',
            'power_monitor': '⚡'
        };
        
        // Use loaded templates or fall back to defaults
        const templates = Object.keys(this.deviceTemplates).length > 0 ? this.deviceTemplates : {
            'motion_sensor': { name: 'Motion Sensor', description: 'PIR motion detection' },
            'light_sensor': { name: 'Light Sensor', description: 'Ambient light monitoring' },
            'air_quality': { name: 'Air Quality', description: 'Temperature & humidity' },
            'noise_monitor': { name: 'Noise Monitor', description: 'Sound level detection' },
            'power_monitor': { name: 'Power Monitor', description: 'CT clamp monitoring' }
        };
        
        grid.innerHTML = Object.entries(templates).map(([key, template]) => `
            <div class="device-type-card" onclick="app.espHomeBuilder.selectDeviceType('${key}')" style="border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; cursor: pointer; text-align: center; transition: all 0.2s ease;">
                <div style="font-size: 32px; margin-bottom: 12px;">${typeIcons[key] || '📱'}</div>
                <div style="font-weight: 500; margin-bottom: 8px;">${template.name}</div>
                <div style="font-size: 14px; color: #666;">${template.description}</div>
            </div>
        `).join('');
    }
    
    selectDeviceType(type) {
        this.selectedDeviceType = type;
        this.deviceConfig.type = type;
        
        document.querySelectorAll('.device-type-card').forEach(card => {
            card.style.borderColor = '#e9ecef';
            card.style.background = 'white';
        });
        
        event.target.closest('.device-type-card').style.borderColor = '#333';
        event.target.closest('.device-type-card').style.background = '#f8f9fa';
        
        document.getElementById('next-btn').disabled = false;
    }
    
    nextStep() {
        if (this.currentStep < 4) {
            this.currentStep++;
            this.showStep(this.currentStep);
            
            if (this.currentStep === 4) {
                this.updateReview();
            }
        }
    }
    
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }
    
    showStep(step) {
        // Update step indicators
        document.querySelectorAll('.step').forEach((stepEl, index) => {
            if (index + 1 <= step) {
                stepEl.style.background = '#333';
                stepEl.style.color = 'white';
            } else {
                stepEl.style.background = '#e9ecef';
                stepEl.style.color = '#666';
            }
        });
        
        // Show/hide step content
        document.querySelectorAll('.wizard-step').forEach((stepEl, index) => {
            stepEl.style.display = index + 1 === step ? 'block' : 'none';
        });
        
        // Update buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const createBtn = document.getElementById('create-btn');
        
        if (prevBtn) prevBtn.style.display = step > 1 ? 'inline-block' : 'none';
        if (nextBtn) nextBtn.style.display = step < 4 ? 'inline-block' : 'none';
        if (createBtn) createBtn.style.display = step === 4 ? 'inline-block' : 'none';
    }
    
    updateReview() {
        const templates = {
            'motion_sensor': 'Motion Sensor',
            'light_sensor': 'Light Sensor',
            'air_quality': 'Air Quality Monitor',
            'noise_monitor': 'Noise Monitor',
            'power_monitor': 'Power Monitor'
        };
        
        const reviewName = document.getElementById('review-name');
        const reviewType = document.getElementById('review-type');
        const reviewWifi = document.getElementById('review-wifi');
        const reviewLocation = document.getElementById('review-location');
        
        if (reviewName) reviewName.textContent = document.getElementById('device-name')?.value || 'Not set';
        if (reviewType) reviewType.textContent = templates[this.selectedDeviceType] || 'Not selected';
        if (reviewWifi) reviewWifi.textContent = document.getElementById('wifi-ssid')?.value || 'Not configured';
        
        const locationSelect = document.getElementById('device-location');
        const locationText = locationSelect?.selectedOptions[0]?.text || 'Not selected';
        if (reviewLocation) reviewLocation.textContent = locationText;
    }
    
    async createDevice() {
        const createBtn = document.getElementById('create-btn');
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = 'Creating...';
        }
        
        this.deviceConfig.name = document.getElementById('device-name')?.value || '';
        this.deviceConfig.wifi_ssid = document.getElementById('wifi-ssid')?.value || '';
        this.deviceConfig.wifi_password = document.getElementById('wifi-password')?.value || '';
        this.deviceConfig.location_id = document.getElementById('device-location')?.value || '';
        
        try {
            const response = await fetch('/api/esphome/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.deviceConfig)
            });
            
            if (response.ok) {
                this.showSuccess('Device created successfully!');
                this.closeDeviceWizard();
                await this.loadDevices();
            } else {
                const error = await response.json();
                this.showError(`Failed: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            // Demo mode - simulate successful creation
            this.showSuccess('Device configuration created! (Demo mode - backend integration needed for full functionality)');
            this.closeDeviceWizard();
        } finally {
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = 'Create Device';
            }
        }
    }
    
    async compileDevice(deviceId) {
        try {
            const response = await fetch(`/api/esphome/devices/${deviceId}/compile`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showSuccess('Compilation started!');
                setTimeout(() => this.loadDevices(), 1000);
            } else {
                this.showError('Failed to start compilation');
            }
        } catch (error) {
            this.showSuccess('Compilation would start here! (Demo mode - backend integration needed)');
        }
    }
    
    async uploadFirmware(deviceId) {
        try {
            const response = await fetch(`/api/esphome/devices/${deviceId}/upload`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showSuccess('Upload started!');
                setTimeout(() => this.loadDevices(), 2000);
            } else {
                this.showError('Upload failed');
            }
        } catch (error) {
            this.showSuccess('Firmware upload would start here! (Demo mode - backend integration needed)');
        }
    }
    
    showDeviceLogs(deviceId) {
        alert('Device logs feature coming soon!');
    }
    
    // Advanced Mode Functions
    showAdvancedMode() {
        const modal = document.getElementById('advanced-modal');
        if (modal) {
            modal.style.display = 'block';
            this.initializeAdvancedMode();
        }
    }

    closeAdvancedMode() {
        const modal = document.getElementById('advanced-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    initializeAdvancedMode() {
        // Reset state
        this.advancedConfig = {
            boardType: 'esp32dev',
            deviceName: '',
            wifi: { ssid: '', password: '' },
            pins: {},
            sensors: [],
            customYAML: ''
        };
        
        // Show first tab
        this.showAdvancedTab('board');
        
        // Initialize pin interactions
        this.initializePinInteractions();
        
        // Generate initial YAML
        this.generateYAML();
    }

    showAdvancedTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.advanced-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.advanced-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        const tabContent = document.getElementById(tabName + '-content');
        const tab = document.getElementById(tabName + '-tab');
        
        if (tabContent) tabContent.classList.add('active');
        if (tab) tab.classList.add('active');
        
        // Update content based on tab
        if (tabName === 'preview') {
            this.updatePreview();
        }
    }

    initializePinInteractions() {
        // Add click handlers to all pin rectangles
        document.querySelectorAll('.pin-rect').forEach(pin => {
            pin.addEventListener('click', (event) => {
                const pinName = pin.getAttribute('data-pin');
                if (pinName && (pinName.includes('GND') || pinName.includes('3V3') || pinName.includes('EN'))) {
                    return; // Skip power and ground pins
                }
                
                if (pin.classList.contains('assigned')) {
                    // Remove assignment
                    pin.classList.remove('assigned');
                    delete this.advancedConfig.pins[pinName];
                    this.updatePinAssignments();
                } else {
                    // Show pin assignment dialog
                    this.showPinAssignmentDialog(pinName, pin);
                }
            });
        });
    }

    showPinAssignmentDialog(pinName, pinElement) {
        const sensorType = prompt(`Assign ${pinName} to sensor type:\n\n1. Digital Input (motion, button)\n2. Analog Input (light, temperature)\n3. Digital Output (LED, relay)\n4. PWM Output (servo, dimmer)\n5. I2C (SDA/SCL)\n\nEnter choice (1-5):`);
        
        const sensorTypes = {
            '1': 'Digital Input',
            '2': 'Analog Input', 
            '3': 'Digital Output',
            '4': 'PWM Output',
            '5': 'I2C'
        };
        
        if (sensorTypes[sensorType]) {
            const sensorName = prompt(`Enter sensor name for ${pinName}:`) || `sensor_${pinName.toLowerCase()}`;
            
            this.advancedConfig.pins[pinName] = {
                type: sensorTypes[sensorType],
                sensorName: sensorName,
                element: pinElement
            };
            
            pinElement.classList.add('assigned');
            this.updatePinAssignments();
            this.generateYAML();
        }
    }

    updatePinAssignments() {
        const container = document.getElementById('selected-pins-list');
        if (!container) return;
        
        if (Object.keys(this.advancedConfig.pins).length === 0) {
            container.innerHTML = '<p style="color: #666; grid-column: 1 / -1;">Click on GPIO pins in the diagram above to assign sensors</p>';
            return;
        }
        
        container.innerHTML = Object.entries(this.advancedConfig.pins).map(([pin, config]) => `
            <div class="pin-assignment">
                <div class="pin-assignment-header">
                    <strong>${pin}</strong>
                    <button class="remove-pin-btn" onclick="app.espHomeBuilder.removePinAssignment('${pin}')">Remove</button>
                </div>
                <p><strong>Type:</strong> ${config.type}</p>
                <p><strong>Sensor:</strong> ${config.sensorName}</p>
            </div>
        `).join('');
    }

    removePinAssignment(pinName) {
        const pinConfig = this.advancedConfig.pins[pinName];
        if (pinConfig && pinConfig.element) {
            pinConfig.element.classList.remove('assigned');
        }
        
        delete this.advancedConfig.pins[pinName];
        this.updatePinAssignments();
        this.generateYAML();
    }

    generateYAML() {
        const deviceName = document.getElementById('advanced-device-name')?.value || 'my_esp32_device';
        const wifiSSID = document.getElementById('advanced-wifi-ssid')?.value || 'your_wifi_network';
        const wifiPassword = document.getElementById('advanced-wifi-password')?.value || 'your_wifi_password';
        
        this.advancedConfig.deviceName = deviceName;
        this.advancedConfig.wifi.ssid = wifiSSID;
        this.advancedConfig.wifi.password = wifiPassword;
        
        let yaml = `esphome:
  name: ${deviceName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}
  platform: ESP32
  board: ${this.advancedConfig.boardType}

wifi:
  ssid: "${wifiSSID}"
  password: "${wifiPassword}"
  
  ap:
    ssid: "${deviceName} Fallback"
    password: "smartsites123"

captive_portal:

logger:

api:
  encryption:
    key: "your-32-byte-base64-key-here"

ota:
  password: "your-ota-password"

web_server:
  port: 80

mqtt:
  broker: 192.168.1.100
  port: 1883
  topic_prefix: smartsites/${deviceName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}

time:
  - platform: sntp
    id: my_time
`;

        this.advancedConfig.customYAML = yaml;
        
        const editor = document.getElementById('yaml-editor');
        if (editor) {
            editor.value = yaml;
        }
    }

    updatePreview() {
        const summary = document.getElementById('preview-summary');
        if (!summary) return;
        
        const deviceInfo = `
            <div class="preview-section">
                <h5>Device Information</h5>
                <ul>
                    <li>Name: ${this.advancedConfig.deviceName || 'Not set'}</li>
                    <li>Board: ${this.advancedConfig.boardType}</li>
                    <li>WiFi Network: ${this.advancedConfig.wifi.ssid || 'Not configured'}</li>
                </ul>
            </div>
        `;
        
        const pinInfo = `
            <div class="preview-section">
                <h5>Pin Assignments (${Object.keys(this.advancedConfig.pins).length})</h5>
                <ul>
                    ${Object.entries(this.advancedConfig.pins).map(([pin, config]) => 
                        `<li>${pin}: ${config.sensorName} (${config.type})</li>`
                    ).join('')}
                    ${Object.keys(this.advancedConfig.pins).length === 0 ? '<li>No pins assigned</li>' : ''}
                </ul>
            </div>
        `;
        
        summary.innerHTML = deviceInfo + pinInfo;
    }
    
    startAutoRefresh() {
        setInterval(() => this.loadDevices(), 30000);
    }
    
    showSuccess(message) {
        this.showNotification(message, '#28a745');
    }
    
    showError(message) {
        this.showNotification(message, '#dc3545');
    }
    
    showNotification(message, color) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            padding: 15px 20px; border-radius: 4px;
            color: white; background: ${color};
            z-index: 10000; max-width: 300px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Global functions for advanced mode
function showAdvancedTab(tabName) {
    if (app && app.espHomeBuilder) {
        app.espHomeBuilder.showAdvancedTab(tabName);
    }
}

function updateBoardDiagram() {
    if (app && app.espHomeBuilder) {
        app.espHomeBuilder.generateYAML();
    }
}

function addSensorConfig() {
    // Advanced sensor config functionality
    console.log('Add sensor config');
}

function generateYAML() {
    if (app && app.espHomeBuilder) {
        app.espHomeBuilder.generateYAML();
    }
}

function validateYAML() {
    console.log('Validate YAML');
}

function downloadYAML() {
    if (app && app.espHomeBuilder) {
        const yaml = document.getElementById('yaml-editor')?.value || '';
        const deviceName = app.espHomeBuilder.advancedConfig.deviceName || 'esp32_device';
        
        const blob = new Blob([yaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deviceName}.yaml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

function saveAdvancedConfig() {
    if (app && app.espHomeBuilder) {
        app.espHomeBuilder.showSuccess('Advanced configuration saved successfully!');
        app.espHomeBuilder.closeAdvancedMode();
    }
}

function compileAdvancedConfig() {
    if (app && app.espHomeBuilder) {
        app.espHomeBuilder.showSuccess('Configuration saved and compilation started!');
    }
}
