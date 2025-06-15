// Smart Sites - Utility Functions

// API utilities
class ApiClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint);
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// Date and time utilities
class DateUtils {
    static formatDate(date, format = 'short') {
        const d = new Date(date);
        
        switch (format) {
            case 'short':
                return d.toLocaleDateString();
            case 'long':
                return d.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            case 'time':
                return d.toLocaleTimeString();
            case 'datetime':
                return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
            case 'iso':
                return d.toISOString();
            default:
                return d.toString();
        }
    }

    static timeAgo(date) {
        const now = new Date();
        const then = new Date(date);
        const diff = now - then;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    static isRecent(date, threshold = 5) {
        const now = new Date();
        const then = new Date(date);
        const diff = now - then;
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= threshold;
    }
}

// Local storage utilities
class StorageUtils {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
        }
    }

    static clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }
}

// Validation utilities
class ValidationUtils {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidIP(ip) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
    }

    static isValidMacAddress(mac) {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac);
    }

    static isValidDeviceName(name) {
        // Device names should be alphanumeric with underscores/hyphens
        const nameRegex = /^[a-zA-Z0-9_-]+$/;
        return name && name.length >= 3 && name.length <= 50 && nameRegex.test(name);
    }

    static sanitizeDeviceName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_+|_+$/g, '');
    }
}

// Number and unit utilities
class NumberUtils {
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static formatPower(watts, decimals = 1) {
        if (watts < 1000) {
            return `${watts.toFixed(decimals)}W`;
        } else {
            return `${(watts / 1000).toFixed(decimals)}kW`;
        }
    }

    static formatTemperature(celsius, unit = 'C', decimals = 1) {
        const value = parseFloat(celsius);
        switch (unit.toUpperCase()) {
            case 'F':
                return `${((value * 9/5) + 32).toFixed(decimals)}°F`;
            case 'K':
                return `${(value + 273.15).toFixed(decimals)}K`;
            default:
                return `${value.toFixed(decimals)}°C`;
        }
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static roundTo(value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }
}

// DOM utilities
class DomUtils {
    static createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (content) {
            element.textContent = content;
        }
        
        return element;
    }

    static hide(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    static show(element, display = 'block') {
        if (element) {
            element.style.display = display;
        }
    }

    static toggle(element, display = 'block') {
        if (element) {
            element.style.display = element.style.display === 'none' ? display : 'none';
        }
    }

    static addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    }

    static removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    }

    static toggleClass(element, className) {
        if (element && className) {
            element.classList.toggle(className);
        }
    }

    static hasClass(element, className) {
        return element ? element.classList.contains(className) : false;
    }
}

// Event utilities
class EventUtils {
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static once(element, event, callback) {
        const handler = (e) => {
            callback(e);
            element.removeEventListener(event, handler);
        };
        element.addEventListener(event, handler);
    }
}

// Loading and notification utilities
class NotificationUtils {
    static show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            color: white;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#007bff'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    notification.parentNode.removeChild(notification);
                }, 300);
            }
        }, duration);
    }

    static success(message, duration) {
        this.show(message, 'success', duration);
    }

    static error(message, duration) {
        this.show(message, 'error', duration);
    }

    static warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    static info(message, duration) {
        this.show(message, 'info', duration);
    }
}

class LoadingUtils {
    static show(target = document.body, message = 'Loading...') {
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        loading.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        if (target.style.position !== 'relative' && target.style.position !== 'absolute') {
            target.style.position = 'relative';
        }
        
        target.appendChild(loading);
        return loading;
    }

    static hide(loading) {
        if (loading && loading.parentNode) {
            loading.parentNode.removeChild(loading);
        }
    }
}

// Export utilities for global use
window.ApiClient = ApiClient;
window.DateUtils = DateUtils;
window.StorageUtils = StorageUtils;
window.ValidationUtils = ValidationUtils;
window.NumberUtils = NumberUtils;
window.DomUtils = DomUtils;
window.EventUtils = EventUtils;
window.NotificationUtils = NotificationUtils;
window.LoadingUtils = LoadingUtils;

// Create global instances
window.apiClient = new ApiClient();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-message {
        color: #333;
        font-size: 14px;
    }
    
    .loading-spinner {
        text-align: center;
    }
`;
document.head.appendChild(style);
