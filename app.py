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

# esphome_integration.py - Add this to your app.py file

import yaml
import subprocess
import os
import requests
import json
from flask import jsonify, request
import paho.mqtt.client as mqtt
from threading import Thread
import time

# ESPHome configuration templates
ESPHOME_TEMPLATES = {
    'motion_sensor': {
        'name': 'Motion Sensor',
        'description': 'PIR or mmWave motion detection',
        'sensors': ['binary_sensor'],
        'config': {
            'binary_sensor': {
                'platform': 'gpio',
                'pin': 'GPIO2',
                'name': 'Motion',
                'device_class': 'motion'
            }
        }
    },
    'light_sensor': {
        'name': 'Light Sensor',
        'description': 'Ambient light monitoring',
        'sensors': ['sensor'],
        'config': {
            'sensor': {
                'platform': 'adc',
                'pin': 'A0',
                'name': 'Light Level',
                'unit_of_measurement': 'lux'
            }
        }
    },
    'air_quality': {
        'name': 'Air Quality Monitor',
        'description': 'Temperature, humidity, and air quality',
        'sensors': ['sensor'],
        'config': {
            'sensor': [
                {
                    'platform': 'dht',
                    'pin': 'GPIO4',
                    'temperature': {'name': 'Temperature'},
                    'humidity': {'name': 'Humidity'}
                },
                {
                    'platform': 'mq135',
                    'pin': 'A0',
                    'name': 'Air Quality'
                }
            ]
        }
    },
    'noise_monitor': {
        'name': 'Noise Level Monitor',
        'description': 'Sound level monitoring',
        'sensors': ['sensor'],
        'config': {
            'sensor': {
                'platform': 'adc',
                'pin': 'A0',
                'name': 'Noise Level',
                'unit_of_measurement': 'dB'
            }
        }
    },
    'power_monitor': {
        'name': 'Power Monitor',
        'description': 'CT clamp power monitoring',
        'sensors': ['sensor'],
        'config': {
            'sensor': {
                'platform': 'ct_clamp',
                'pin': 'A0',
                'name': 'Power Consumption',
                'unit_of_measurement': 'W'
            }
        }
    }
}

# Database model for ESPHome devices
class ESPHomeDevice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    device_type = db.Column(db.String(50), nullable=False)
    mac_address = db.Column(db.String(17), unique=True)
    ip_address = db.Column(db.String(15))
    esphome_config = db.Column(db.Text)  # YAML configuration
    firmware_version = db.Column(db.String(20))
    compilation_status = db.Column(db.String(20), default='pending')  # pending, compiling, success, error
    last_seen = db.Column(db.DateTime)
    site_location_id = db.Column(db.Integer, db.ForeignKey('site_location.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    site_location = db.relationship('SiteLocation', backref=db.backref('esphome_devices', lazy=True))

# MQTT client for real-time communication
mqtt_client = None

def init_mqtt():
    global mqtt_client
    mqtt_client = mqtt.Client()
    mqtt_client.on_connect = on_mqtt_connect
    mqtt_client.on_message = on_mqtt_message
    
    try:
        mqtt_client.connect("localhost", 1883, 60)
        mqtt_client.loop_start()
        print("MQTT client connected successfully")
    except Exception as e:
        print(f"MQTT connection failed: {e}")

def on_mqtt_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT with result code {rc}")
    # Subscribe to all device topics
    client.subscribe("smartsites/+/+")
    client.subscribe("esphome/+/+")

def on_mqtt_message(client, userdata, msg):
    try:
        topic_parts = msg.topic.split('/')
        if len(topic_parts) >= 3:
            device_name = topic_parts[1]
            sensor_name = topic_parts[2]
            value = msg.payload.decode()
            
            # Update device status in database
            update_device_sensor_value(device_name, sensor_name, value)
            
    except Exception as e:
        print(f"Error processing MQTT message: {e}")

def update_device_sensor_value(device_name, sensor_name, value):
    """Update sensor value in database"""
    device = Device.query.filter_by(name=device_name).first()
    if device:
        device.status = 'online'
        device.last_seen = datetime.utcnow()
        
        entity = Entity.query.filter_by(device_id=device.id, entity_name=sensor_name).first()
        if entity:
            old_value = entity.current_value
            entity.current_value = value
            entity.last_updated = datetime.utcnow()
            
            # Record history for significant changes
            if old_value != value:
                history = History(
                    entity_id=entity.id,
                    old_value=old_value,
                    new_value=value
                )
                db.session.add(history)
        
        db.session.commit()

# ESPHome API Routes
@app.route('/api/esphome/templates')
def get_esphome_templates():
    """Get available ESPHome device templates"""
    return jsonify(ESPHOME_TEMPLATES)

@app.route('/api/esphome/devices')
def get_esphome_devices():
    """Get all ESPHome devices"""
    devices = ESPHomeDevice.query.all()
    return jsonify([{
        'id': device.id,
        'name': device.name,
        'type': device.device_type,
        'mac_address': device.mac_address,
        'ip_address': device.ip_address,
        'compilation_status': device.compilation_status,
        'last_seen': device.last_seen.isoformat() if device.last_seen else None,
        'location': device.site_location.name if device.site_location else None,
        'firmware_version': device.firmware_version
    } for device in devices])

@app.route('/api/esphome/devices', methods=['POST'])
def create_esphome_device():
    """Create a new ESPHome device configuration"""
    data = request.get_json()
    
    # Generate ESPHome YAML configuration
    config = generate_esphome_config(data)
    
    device = ESPHomeDevice(
        name=data['name'],
        device_type=data['type'],
        esphome_config=config,
        site_location_id=data.get('site_location_id'),
        compilation_status='pending'
    )
    
    db.session.add(device)
    db.session.commit()
    
    # Start compilation in background
    Thread(target=compile_esphome_device, args=(device.id,)).start()
    
    return jsonify({
        'id': device.id,
        'message': 'Device created successfully',
        'config': config
    })

@app.route('/api/esphome/devices/<int:device_id>/config')
def get_device_config(device_id):
    """Get device configuration"""
    device = ESPHomeDevice.query.get_or_404(device_id)
    return jsonify({
        'config': device.esphome_config,
        'status': device.compilation_status
    })

@app.route('/api/esphome/devices/<int:device_id>/compile', methods=['POST'])
def compile_device(device_id):
    """Compile ESPHome configuration"""
    device = ESPHomeDevice.query.get_or_404(device_id)
    
    # Update compilation status
    device.compilation_status = 'compiling'
    db.session.commit()
    
    # Start compilation in background
    Thread(target=compile_esphome_device, args=(device_id,)).start()
    
    return jsonify({'message': 'Compilation started'})

@app.route('/api/esphome/devices/<int:device_id>/upload', methods=['POST'])
def upload_firmware(device_id):
    """Upload firmware to device"""
    device = ESPHomeDevice.query.get_or_404(device_id)
    
    if device.compilation_status != 'success':
        return jsonify({'error': 'Device must be compiled successfully first'}), 400
    
    # Start upload in background
    Thread(target=upload_esphome_firmware, args=(device_id,)).start()
    
    return jsonify({'message': 'Firmware upload started'})

@app.route('/api/esphome/discover')
def discover_devices():
    """Discover ESPHome devices on network"""
    discovered = []
    
    # Scan local network for ESPHome devices
    try:
        import nmap
        nm = nmap.PortScanner()
        nm.scan('192.168.1.0/24', '80')
        
        for host in nm.all_hosts():
            if nm[host].state() == 'up':
                # Check if it's an ESPHome device
                try:
                    response = requests.get(f'http://{host}/', timeout=2)
                    if 'ESPHome' in response.text:
                        discovered.append({
                            'ip': host,
                            'hostname': nm[host].hostname(),
                            'status': 'discovered'
                        })
                except:
                    pass
    except ImportError:
        # Fallback discovery method
        pass
    
    return jsonify(discovered)

def generate_esphome_config(data):
    """Generate ESPHome YAML configuration"""
    template = ESPHOME_TEMPLATES.get(data['type'])
    if not template:
        raise ValueError(f"Unknown device type: {data['type']}")
    
    config = {
        'esphome': {
            'name': data['name'].lower().replace(' ', '_'),
            'platform': 'ESP32',
            'board': 'esp32dev'
        },
        'wifi': {
            'ssid': '${wifi_ssid}',
            'password': '${wifi_password}',
            'ap': {
                'ssid': f"{data['name']} Fallback",
                'password': 'smartsites123'
            }
        },
        'captive_portal': {},
        'logger': {},
        'api': {
            'encryption': {
                'key': '${api_key}'
            }
        },
        'ota': {
            'password': '${ota_password}'
        },
        'mqtt': {
            'broker': '${mqtt_broker}',
            'port': 1883,
            'topic_prefix': f'smartsites/{data["name"].lower().replace(" ", "_")}'
        },
        'web_server': {
            'port': 80
        }
    }
    
    # Add sensor configurations
    config.update(template['config'])
    
    # Add custom pins and settings from user input
    if 'pins' in data:
        for pin_config in data['pins']:
            # Update pin configurations based on user selection
            pass
    
    return yaml.dump(config, default_flow_style=False)

def compile_esphome_device(device_id):
    """Compile ESPHome configuration in background"""
    device = ESPHomeDevice.query.get(device_id)
    if not device:
        return
    
    try:
        # Create temporary directory for compilation
        config_dir = f'/tmp/esphome/{device.name}'
        os.makedirs(config_dir, exist_ok=True)
        
        # Write configuration file
        config_file = f'{config_dir}/{device.name}.yaml'
        with open(config_file, 'w') as f:
            f.write(device.esphome_config)
        
        # Run ESPHome compilation
        result = subprocess.run([
            'esphome', 'compile', config_file
        ], capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            device.compilation_status = 'success'
            device.firmware_version = 'compiled'
        else:
            device.compilation_status = 'error'
            print(f"Compilation error: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        device.compilation_status = 'error'
        print("Compilation timeout")
    except Exception as e:
        device.compilation_status = 'error'
        print(f"Compilation exception: {e}")
    
    db.session.commit()

def upload_esphome_firmware(device_id):
    """Upload firmware to ESPHome device"""
    device = ESPHomeDevice.query.get(device_id)
    if not device:
        return
    
    try:
        config_file = f'/tmp/esphome/{device.name}/{device.name}.yaml'
        
        # Upload firmware over the air
        if device.ip_address:
            result = subprocess.run([
                'esphome', 'upload', config_file, '--device', device.ip_address
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print(f"Firmware uploaded successfully to {device.name}")
                # Create corresponding Device and Entity records
                create_device_from_esphome(device)
            else:
                print(f"Upload error: {result.stderr}")
                
    except Exception as e:
        print(f"Upload exception: {e}")

def create_device_from_esphome(esphome_device):
    """Create Device and Entity records from ESPHome device"""
    # Check if device already exists
    existing = Device.query.filter_by(name=esphome_device.name).first()
    if existing:
        return existing
    
    # Create new device
    device = Device(
        name=esphome_device.name,
        device_type=esphome_device.device_type,
        site_location_id=esphome_device.site_location_id,
        status='online',
        ip_address=esphome_device.ip_address,
        firmware_version=esphome_device.firmware_version
    )
    
    db.session.add(device)
    db.session.flush()  # Get device ID
    
    # Create entities based on device type
    template = ESPHOME_TEMPLATES.get(esphome_device.device_type)
    if template and 'config' in template:
        create_entities_from_config(device.id, template['config'])
    
    db.session.commit()
    return device

def create_entities_from_config(device_id, config):
    """Create Entity records from ESPHome configuration"""
    for component_type, component_config in config.items():
        if component_type in ['sensor', 'binary_sensor', 'switch']:
            if isinstance(component_config, list):
                configs = component_config
            else:
                configs = [component_config]
            
            for cfg in configs:
                if isinstance(cfg, dict) and 'name' in cfg:
                    entity = Entity(
                        device_id=device_id,
                        entity_name=cfg['name'].lower().replace(' ', '_'),
                        entity_type=component_type,
                        unit_of_measurement=cfg.get('unit_of_measurement'),
                        current_value='unknown'
                    )
                    db.session.add(entity)

# Initialize MQTT when app starts
@app.before_first_request
def initialize_esphome():
    init_mqtt()
    print("ESPHome integration initialized")
