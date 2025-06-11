# app.py - Main Flask application
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager, login_required
from datetime import datetime
import os
import json
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize Flask app
app = Flask(__name__, static_folder='frontend', template_folder='frontend')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'smart-sites-dev-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///smart_sites.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
cors = CORS(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role = db.Column(db.String(20), default='viewer')  # admin, operator, viewer
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class SiteLocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Device(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    device_type = db.Column(db.String(50), nullable=False)  # motion, light, air_quality, etc.
    mac_address = db.Column(db.String(17), unique=True)
    ip_address = db.Column(db.String(15))
    site_location_id = db.Column(db.Integer, db.ForeignKey('site_location.id'))
    status = db.Column(db.String(20), default='offline')  # online, offline, error
    last_seen = db.Column(db.DateTime)
    firmware_version = db.Column(db.String(20))
    labels = db.Column(db.Text)  # JSON string for custom labels
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    site_location = db.relationship('SiteLocation', backref=db.backref('devices', lazy=True))

class Entity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('device.id'), nullable=False)
    entity_name = db.Column(db.String(100), nullable=False)  # mmwave, lux, temperature, etc.
    entity_type = db.Column(db.String(50), nullable=False)  # sensor, switch, binary_sensor
    unit_of_measurement = db.Column(db.String(20))
    current_value = db.Column(db.String(100))
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    device = db.relationship('Device', backref=db.backref('entities', lazy=True))

class History(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entity_id = db.Column(db.Integer, db.ForeignKey('entity.id'), nullable=False)
    old_value = db.Column(db.String(100))
    new_value = db.Column(db.String(100))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    entity = db.relationship('Entity', backref=db.backref('history', lazy=True))

class Automation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    trigger_config = db.Column(db.Text)  # JSON string for trigger configuration
    action_config = db.Column(db.Text)   # JSON string for action configuration
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_triggered = db.Column(db.DateTime)
    
    creator = db.relationship('User', backref=db.backref('automations', lazy=True))

class PowerMeter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    site_location_id = db.Column(db.Integer, db.ForeignKey('site_location.id'))
    ct_ratio = db.Column(db.Float, default=1.0)
    current_power = db.Column(db.Float, default=0.0)
    daily_consumption = db.Column(db.Float, default=0.0)
    last_reading = db.Column(db.DateTime)
    
    site_location = db.relationship('SiteLocation', backref=db.backref('power_meters', lazy=True))

# API Routes
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/devices')
def get_devices():
    """Get all devices with filtering options"""
    location = request.args.get('location')
    sensor_type = request.args.get('sensor_type')
    entity_type = request.args.get('entity')
    label = request.args.get('label')
    
    query = Device.query
    
    if location:
        query = query.join(SiteLocation).filter(SiteLocation.name.ilike(f'%{location}%'))
    if sensor_type:
        query = query.filter(Device.device_type == sensor_type)
    
    devices = query.all()
    
    result = []
    for device in devices:
        device_data = {
            'id': device.id,
            'name': device.name,
            'type': device.device_type,
            'status': device.status,
            'location': device.site_location.name if device.site_location else 'Unknown',
            'last_seen': device.last_seen.isoformat() if device.last_seen else None,
            'entities': []
        }
        
        for entity in device.entities:
            if not entity_type or entity.entity_name == entity_type:
                device_data['entities'].append({
                    'name': entity.entity_name,
                    'value': entity.current_value,
                    'unit': entity.unit_of_measurement,
                    'last_updated': entity.last_updated.isoformat()
                })
        
        # Filter by label if specified
        if label:
            device_labels = json.loads(device.labels or '[]')
            if label in device_labels:
                result.append(device_data)
        else:
            result.append(device_data)
    
    return jsonify(result)

@app.route('/api/devices', methods=['POST'])
def add_device():
    """Add a new device"""
    data = request.get_json()
    
    device = Device(
        name=data['name'],
        device_type=data['type'],
        mac_address=data.get('mac_address'),
        ip_address=data.get('ip_address'),
        site_location_id=data.get('site_location_id'),
        labels=json.dumps(data.get('labels', []))
    )
    
    db.session.add(device)
    db.session.commit()
    
    return jsonify({'id': device.id, 'message': 'Device added successfully'})

@app.route('/api/history')
def get_history():
    """Get device history with pagination"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    history_query = db.session.query(History, Entity, Device, SiteLocation).join(
        Entity, History.entity_id == Entity.id
    ).join(
        Device, Entity.device_id == Device.id
    ).outerjoin(
        SiteLocation, Device.site_location_id == SiteLocation.id
    ).order_by(History.timestamp.desc())
    
    history = history_query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    result = []
    for hist, entity, device, location in history.items:
        result.append({
            'timestamp': hist.timestamp.isoformat(),
            'site_location': location.name if location else 'Unknown',
            'device_type': device.device_type,
            'entity': entity.entity_name,
            'old_value': hist.old_value,
            'new_value': hist.new_value
        })
    
    return jsonify({
        'history': result,
        'pagination': {
            'page': history.page,
            'pages': history.pages,
            'per_page': history.per_page,
            'total': history.total
        }
    })

@app.route('/api/locations')
def get_locations():
    """Get all site locations"""
    locations = SiteLocation.query.all()
    return jsonify([{
        'id': loc.id,
        'name': loc.name,
        'description': loc.description,
        'device_count': len(loc.devices)
    } for loc in locations])

@app.route('/api/locations', methods=['POST'])
def add_location():
    """Add a new site location"""
    data = request.get_json()
    
    location = SiteLocation(
        name=data['name'],
        description=data.get('description', '')
    )
    
    db.session.add(location)
    db.session.commit()
    
    return jsonify({'id': location.id, 'message': 'Location added successfully'})

@app.route('/api/automations')
def get_automations():
    """Get all automations"""
    automations = Automation.query.all()
    return jsonify([{
        'id': auto.id,
        'name': auto.name,
        'description': auto.description,
        'is_active': auto.is_active,
        'last_triggered': auto.last_triggered.isoformat() if auto.last_triggered else None,
        'created_at': auto.created_at.isoformat()
    } for auto in automations])

@app.route('/api/power-consumption')
def get_power_consumption():
    """Get current power consumption data"""
    meters = PowerMeter.query.all()
    
    total_power = sum(meter.current_power for meter in meters)
    
    result = {
        'total_power': total_power,
        'meters': [{
            'id': meter.id,
            'name': meter.name,
            'location': meter.site_location.name if meter.site_location else 'Unknown',
            'current_power': meter.current_power,
            'daily_consumption': meter.daily_consumption,
            'last_reading': meter.last_reading.isoformat() if meter.last_reading else None
        } for meter in meters]
    }
    
    return jsonify(result)

@app.route('/api/dashboard-stats')
def get_dashboard_stats():
    """Get statistics for the dashboard"""
    total_devices = Device.query.count()
    online_devices = Device.query.filter_by(status='online').count()
    total_power = db.session.query(db.func.sum(PowerMeter.current_power)).scalar() or 0
    recent_alerts = History.query.filter(
        History.timestamp >= datetime.utcnow().replace(hour=0, minute=0, second=0)
    ).count()
    
    return jsonify({
        'total_devices': total_devices,
        'online_devices': online_devices,
        'total_power': round(total_power, 2),
        'recent_alerts': recent_alerts
    })

# ESP32/ESPHome Integration Routes
@app.route('/api/esphome/devices')
def get_esphome_devices():
    """Get ESPHome device configurations"""
    # This would integrate with ESPHome API
    return jsonify([])

@app.route('/api/esphome/compile', methods=['POST'])
def compile_esphome_config():
    """Compile ESPHome configuration"""
    data = request.get_json()
    # This would handle ESPHome configuration compilation
    return jsonify({'status': 'success', 'message': 'Configuration compiled'})

# WebSocket for real-time updates (using Flask-SocketIO would be better)
@app.route('/api/device-status-update', methods=['POST'])
def update_device_status():
    """Endpoint for ESP32 devices to report status"""
    data = request.get_json()
    
    device = Device.query.filter_by(mac_address=data.get('mac_address')).first()
    if not device:
        return jsonify({'error': 'Device not found'}), 404
    
    device.status = 'online'
    device.last_seen = datetime.utcnow()
    
    # Update entity values
    for entity_data in data.get('entities', []):
        entity = Entity.query.filter_by(
            device_id=device.id,
            entity_name=entity_data['name']
        ).first()
        
        if entity:
            old_value = entity.current_value
            entity.current_value = entity_data['value']
            entity.last_updated = datetime.utcnow()
            
            # Record history for boolean entities or significant changes
            if old_value != entity.current_value:
                history = History(
                    entity_id=entity.id,
                    old_value=old_value,
                    new_value=entity.current_value
                )
                db.session.add(history)
    
    db.session.commit()
    return jsonify({'status': 'success'})

# Initialize database
def create_tables():
    db.create_all()
    
    # Create default admin user if it doesn't exist
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@smartsites.local',
            role='admin'
        )
        admin.set_password('admin123')  # Change this in production!
        db.session.add(admin)
        
        # Create sample site locations
        locations = [
            SiteLocation(name='Main Office', description='Main office building'),
            SiteLocation(name='Male Toilet', description='Male toilet facilities'),
            SiteLocation(name='Female Toilet', description='Female toilet facilities'),
            SiteLocation(name='Workshop', description='Main workshop area'),
            SiteLocation(name='Storage', description='Equipment storage area')
        ]
        
        for location in locations:
            db.session.add(location)
        
        db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        create_tables()
    app.run(host='0.0.0.0', port=5000, debug=True)
