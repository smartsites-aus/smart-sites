# app.py - Main Flask application
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager, login_required
from datetime import datetime
import os
import json

# Initialize Flask app
app = Flask(__name__, static_folder='frontend', template_folder='frontend')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'smart-sites-dev-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:////opt/smart-sites/data/smart_sites.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
cors = CORS(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Basic Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), default='viewer')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

class Device(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    device_type = db.Column(db.String(50), nullable=False)
    mac_address = db.Column(db.String(17), unique=True)
    ip_address = db.Column(db.String(15))
    status = db.Column(db.String(20), default='offline')
    last_seen = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Routes
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/devices')
def get_devices():
    devices = Device.query.all()
    return jsonify([{
        'id': device.id,
        'name': device.name,
        'type': device.device_type,
        'status': device.status
    } for device in devices])

@app.route('/api/dashboard-stats')
def get_dashboard_stats():
    total_devices = Device.query.count()
    online_devices = Device.query.filter_by(status='online').count()
    
    return jsonify({
        'total_devices': total_devices,
        'online_devices': online_devices,
        'total_power': 0,
        'recent_alerts': 0
    })

# Initialize database
def create_tables():
    db.create_all()

if __name__ == '__main__':
    with app.app_context():
        create_tables()
    app.run(host='0.0.0.0', port=5000, debug=True)

# Static file routes for modular frontend
@app.route('/components/<path:filename>')
def serve_components(filename):
    return send_from_directory('frontend/components', filename)

@app.route('/pages/<path:filename>')
def serve_pages(filename):
    return send_from_directory('frontend/pages', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('frontend/js', filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('frontend/css', filename)

# ESPHome API endpoints
@app.route('/api/esphome/templates')
def get_esphome_templates():
    """Get ESPHome device templates"""
    templates = {
        'motion_sensor': {
            'name': 'Motion Sensor',
            'description': 'PIR motion detection',
            'sensors': ['binary_sensor']
        },
        'light_sensor': {
            'name': 'Light Sensor', 
            'description': 'Ambient light monitoring',
            'sensors': ['sensor']
        },
        'air_quality': {
            'name': 'Air Quality Monitor',
            'description': 'Temperature & humidity',
            'sensors': ['sensor']
        },
        'noise_monitor': {
            'name': 'Noise Monitor',
            'description': 'Sound level detection', 
            'sensors': ['sensor']
        },
        'power_monitor': {
            'name': 'Power Monitor',
            'description': 'CT clamp monitoring',
            'sensors': ['sensor']
        }
    }
    return jsonify(templates)

@app.route('/api/esphome/devices')
def get_esphome_devices():
    """Get ESPHome devices"""
    # Return empty list for now
    return jsonify([])

@app.route('/api/locations')
def get_locations():
    """Get site locations"""
    locations = [
        {'id': 1, 'name': 'Main Office', 'description': 'Main office building', 'device_count': 0},
        {'id': 2, 'name': 'Workshop', 'description': 'Main workshop area', 'device_count': 0}, 
        {'id': 3, 'name': 'Storage', 'description': 'Equipment storage area', 'device_count': 0}
    ]
    return jsonify(locations)

@app.route('/api/history')
def get_history():
    """Get device history"""
    return jsonify({'history': [], 'pagination': {'page': 1, 'pages': 1, 'per_page': 50, 'total': 0}})

@app.route('/api/automations')
def get_automations():
    """Get automations"""
    return jsonify([])
