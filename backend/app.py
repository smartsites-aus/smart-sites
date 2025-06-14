# esphome_integration.py - Enhanced ESPHome Backend Integration
# Add this to your app.py file or create as a separate module

import os
import yaml
import subprocess
import requests
import json
import time
import socket
import threading
from pathlib import Path
from flask import jsonify, request
import paho.mqtt.client as mqtt
from datetime import datetime

# Enhanced ESPHome Device Templates
ESPHOME_TEMPLATES = {
    'motion_sensor': {
        'name': 'Motion Sensor',
        'description': 'PIR or mmWave motion detection for construction site monitoring',
        'sensors': ['binary_sensor'],
        'pins': {
            'motion_pin': {'type': 'digital', 'default': 'GPIO2', 'required': True}
        },
        'config': {
            'binary_sensor': [{
                'platform': 'gpio',
                'pin': '{motion_pin}',
                'name': 'Motion',
                'device_class': 'motion',
                'filters': [{
                    'delayed_off': '10s'
                }]
            }]
        }
    },
    'light_sensor': {
        'name': 'Light Sensor',
        'description': 'Ambient light monitoring with LDR or BH1750',
        'sensors': ['sensor'],
        'pins': {
            'light_pin': {'type': 'analog', 'default': 'A0', 'required': True}
        },
        'config': {
            'sensor': [{
                'platform': 'adc',
                'pin': '{light_pin}',
                'name': 'Light Level',
                'unit_of_measurement': 'V',
                'update_interval': '30s',
                'filters': [{
                    'multiply': 3.3
                }, {
                    'lambda': 'return (x / 3.3) * 100;'
                }]
            }]
        }
    },
    'air_quality': {
        'name': 'Air Quality Monitor',
        'description': 'Temperature, humidity, and air quality monitoring',
        'sensors': ['sensor'],
        'pins': {
            'dht_pin': {'type': 'digital', 'default': 'GPIO4', 'required': True},
            'mq135_pin': {'type': 'analog', 'default': 'A0', 'required': False}
        },
        'config': {
            'sensor': [{
                'platform': 'dht',
                'pin': '{dht_pin}',
                'model': 'DHT22',
                'temperature': {
                    'name': 'Temperature',
                    'unit_of_measurement': '°C'
                },
                'humidity': {
                    'name': 'Humidity',
                    'unit_of_measurement': '%'
                },
                'update_interval': '30s'
            }]
        }
    },
    'noise_monitor': {
        'name': 'Noise Level Monitor',
        'description': 'Sound level monitoring for construction site noise control',
        'sensors': ['sensor'],
        'pins': {
            'microphone_pin': {'type': 'analog', 'default': 'A0', 'required': True}
        },
        'config': {
            'sensor': [{
                'platform': 'adc',
                'pin': '{microphone_pin}',
                'name': 'Noise Level',
                'unit_of_measurement': 'dB',
                'update_interval': '5s',
                'filters': [{
                    'sliding_window_moving_average': {
                        'window_size': 10,
                        'send_every': 5
                    }
                }, {
                    'lambda': 'return (x * 50) + 30;'  # Convert to rough dB estimate
                }]
            }]
        }
    },
    'power_monitor': {
        'name': 'Power Monitor',
        'description': 'CT clamp power monitoring for electrical consumption',
        'sensors': ['sensor'],
        'pins': {
            'ct_pin': {'type': 'analog', 'default': 'A0', 'required': True}
        },
        'config': {
            'sensor': [{
                'platform': 'ct_clamp',
                'pin': '{ct_pin}',
                'name': 'Power Consumption',
                'unit_of_measurement': 'W',
                'update_interval': '10s',
                'sample_duration': '200ms',
                'filters': [{
                    'calibrate_linear': [
                        {'0.0V': '0W'},
                        {'1.0V': '1000W'}
                    ]
                }]
            }]
        }
    },
    'door_window_sensor': {
        'name': 'Door/Window Sensor',
        'description': 'Magnetic reed switch for door/window monitoring',
        'sensors': ['binary_sensor'],
        'pins': {
            'reed_pin': {'type': 'digital', 'default': 'GPIO2', 'required': True}
        },
        'config': {
            'binary_sensor': [{
                'platform': 'gpio',
                'pin': {
                    'number': '{reed_pin}',
                    'mode': 'INPUT_PULLUP'
                },
                'name': 'Door Status',
                'device_class': 'door',
                'filters': [{
                    'delayed_on': '100ms'
                }, {
                    'delayed_off': '100ms'
                }]
            }]
        }
    }
}

class ESPHomeManager:
    def __init__(self, app, db):
        self.app = app
        self.db = db
        self.base_path = Path('/opt/smart-sites/esphome')
        self.base_path.mkdir(exist_ok=True, parents=True)
        
        # ESPHome paths
        self.config_path = self.base_path / 'config'
        self.build_path = self.base_path / 'build'
        self.secrets_file = self.config_path / 'secrets.yaml'
        
        # Create directories
        self.config_path.mkdir(exist_ok=True)
        self.build_path.mkdir(exist_ok=True)
        
        # Initialize secrets file
        self._create_secrets_file()
        
    def _create_secrets_file(self):
        """Create or update the ESPHome secrets file"""
        secrets = {
            'wifi_ssid': 'YourWiFiNetwork',
            'wifi_password': 'YourWiFiPassword',
            'api_encryption_key': self._generate_key(),
            'ota_password': self._generate_password(),
            'mqtt_broker': '192.168.1.100',
            'mqtt_username': 'smartsites',
            'mqtt_password': 'smartsites123'
        }
        
        with open(self.secrets_file, 'w') as f:
            yaml.dump(secrets, f, default_flow_style=False)
    
    def _generate_key(self):
        """Generate a 32-byte encryption key"""
        import secrets
        return secrets.token_hex(32)
    
    def _generate_password(self):
        """Generate a random password"""
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(12))
    
    def get_templates(self):
        """Get available device templates"""
        return ESPHOME_TEMPLATES
    
    def create_device_config(self, device_data):
        """Create ESPHome configuration for a device"""
        template = ESPHOME_TEMPLATES.get(device_data['type'])
        if not template:
            raise ValueError(f"Unknown device type: {device_data['type']}")
        
        # Generate device name
        device_name = device_data['name'].lower().replace(' ', '_').replace('-', '_')
        device_name = ''.join(c for c in device_name if c.isalnum() or c == '_')
        
        # Base configuration
        config = {
            'esphome': {
                'name': device_name,
                'platform': 'ESP32',
                'board': 'esp32dev'
            },
            'wifi': {
                'ssid': '!secret wifi_ssid',
                'password': '!secret wifi_password',
                'ap': {
                    'ssid': f"{device_data['name']} Fallback",
                    'password': 'smartsites123'
                }
            },
            'captive_portal': {},
            'logger': {
                'level': 'INFO'
            },
            'api': {
                'encryption': {
                    'key': '!secret api_encryption_key'
                }
            },
            'ota': {
                'password': '!secret ota_password'
            },
            'mqtt': {
                'broker': '!secret mqtt_broker',
                'port': 1883,
                'username': '!secret mqtt_username',
                'password': '!secret mqtt_password',
                'topic_prefix': f'smartsites/{device_name}',
                'discovery': True
            },
            'web_server': {
                'port': 80
            },
            'time': {
                'platform': 'sntp',
                'id': 'my_time'
            }
        }
        
        # Add sensor configurations
        sensor_config = template['config'].copy()
        
        # Replace pin placeholders with actual values
        for component_type, components in sensor_config.items():
            if isinstance(components, list):
                for component in components:
                    self._replace_pin_placeholders(component, device_data.get('pins', {}))
            else:
                self._replace_pin_placeholders(components, device_data.get('pins', {}))
        
        # Merge sensor config
        config.update(sensor_config)
        
        return config
    
    def _replace_pin_placeholders(self, config, pins):
        """Recursively replace pin placeholders in configuration"""
        if isinstance(config, dict):
            for key, value in config.items():
                if isinstance(value, str) and value.startswith('{') and value.endswith('}'):
                    pin_name = value[1:-1]
                    if pin_name in pins:
                        config[key] = pins[pin_name]
                elif isinstance(value, (dict, list)):
                    self._replace_pin_placeholders(value, pins)
        elif isinstance(config, list):
            for item in config:
                self._replace_pin_placeholders(item, pins)
    
    def save_device_config(self, device_name, config):
        """Save device configuration to file"""
        config_file = self.config_path / f"{device_name}.yaml"
        
        with open(config_file, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, indent=2)
        
        return str(config_file)
    
    def compile_device(self, device_name):
        """Compile ESPHome configuration"""
        config_file = self.config_path / f"{device_name}.yaml"
        
        if not config_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_file}")
        
        # Run ESPHome compile command
        cmd = [
            'esphome', 'compile', str(config_file)
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minute timeout
                cwd=str(self.base_path)
            )
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'return_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Compilation timed out after 10 minutes',
                'return_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'return_code': -1
            }
    
    def upload_device(self, device_name, device_ip=None):
        """Upload firmware to device"""
        config_file = self.config_path / f"{device_name}.yaml"
        
        if not config_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_file}")
        
        # Determine upload method
        if device_ip:
            # Over-the-air upload
            cmd = [
                'esphome', 'upload', str(config_file),
                '--device', device_ip
            ]
        else:
            # USB upload (will prompt for port)
            cmd = [
                'esphome', 'upload', str(config_file)
            ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                cwd=str(self.base_path)
            )
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'return_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Upload timed out after 5 minutes',
                'return_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'return_code': -1
            }
    
    def discover_devices(self):
        """Discover ESPHome devices on the network"""
        discovered = []
        
        # Get local network range
        import ipaddress
        
        try:
            # Get local IP to determine network
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            
            # Calculate network range
            network = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)
            
            # Scan for devices with open port 80
            def scan_ip(ip):
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(1)
                    result = sock.connect_ex((str(ip), 80))
                    sock.close()
                    
                    if result == 0:
                        # Check if it's ESPHome by trying to get the web interface
                        try:
                            response = requests.get(f"http://{ip}", timeout=2)
                            if 'ESPHome' in response.text or 'esp' in response.text.lower():
                                # Try to get device info
                                info_response = requests.get(f"http://{ip}/text_sensor/device_info", timeout=2)
                                device_info = info_response.text if info_response.status_code == 200 else "Unknown"
                                
                                discovered.append({
                                    'ip': str(ip),
                                    'hostname': self._get_hostname(str(ip)),
                                    'info': device_info,
                                    'status': 'discovered'
                                })
                        except:
                            pass
                except:
                    pass
            
            # Use threading for faster scanning
            threads = []
            for ip in network.hosts():
                thread = threading.Thread(target=scan_ip, args=(ip,))
                threads.append(thread)
                thread.start()
                
                # Limit concurrent threads
                if len(threads) >= 50:
                    for t in threads:
                        t.join()
                    threads = []
            
            # Wait for remaining threads
            for thread in threads:
                thread.join()
                
        except Exception as e:
            print(f"Discovery error: {e}")
        
        return discovered
    
    def _get_hostname(self, ip):
        """Get hostname for IP address"""
        try:
            return socket.gethostbyaddr(ip)[0]
        except:
            return None
    
    def get_device_logs(self, device_name, device_ip=None):
        """Get real-time logs from device"""
        config_file = self.config_path / f"{device_name}.yaml"
        
        if device_ip:
            cmd = ['esphome', 'logs', str(config_file), '--device', device_ip]
        else:
            cmd = ['esphome', 'logs', str(config_file)]
        
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=str(self.base_path)
            )
            
            return process
        except Exception as e:
            return None

# Initialize ESPHome manager
esphome_manager = None

def init_esphome_manager(app, db):
    global esphome_manager
    esphome_manager = ESPHomeManager(app, db)
    return esphome_manager

# Enhanced API Routes
@app.route('/api/esphome/templates')
def get_esphome_templates():
    """Get available ESPHome device templates"""
    if esphome_manager:
        return jsonify(esphome_manager.get_templates())
    else:
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
        'firmware_version': device.firmware_version,
        'created_at': device.created_at.isoformat()
    } for device in devices])

@app.route('/api/esphome/devices', methods=['POST'])
def create_esphome_device():
    data = request.get_json()
    
    # Handle both simple and advanced mode configurations
    if data.get('mode') == 'advanced':
        # Process advanced pin mapping configuration
        config = generate_advanced_esphome_config(data)
    else:
        # Process simple wizard configuration (existing code)
        config = generate_simple_esphome_config(data)
    
    # Save to database...
    
    try:
        # Validate required fields
        if not data.get('name') or not data.get('type'):
            return jsonify({'error': 'Name and type are required'}), 400
        
        # Generate device configuration
        if esphome_manager:
            config = esphome_manager.create_device_config(data)
            device_name = data['name'].lower().replace(' ', '_').replace('-', '_')
            device_name = ''.join(c for c in device_name if c.isalnum() or c == '_')
            
            # Save configuration file
            config_file = esphome_manager.save_device_config(device_name, config)
            config_yaml = yaml.dump(config, default_flow_style=False)
        else:
            config_yaml = "# ESPHome configuration will be generated here"
            config_file = None
        
        # Create database record
        device = ESPHomeDevice(
            name=data['name'],
            device_type=data['type'],
            esphome_config=config_yaml,
            site_location_id=data.get('site_location_id'),
            compilation_status='pending'
        )
        
        db.session.add(device)
        db.session.commit()
        
        # Start compilation in background if manager is available
        if esphome_manager and config_file:
            threading.Thread(
                target=compile_device_background,
                args=(device.id, device_name)
            ).start()
        
        return jsonify({
            'id': device.id,
            'message': 'Device created successfully',
            'config': config_yaml,
            'config_file': config_file
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def compile_device_background(device_id, device_name):
    """Compile device in background thread"""
    with app.app_context():
        device = ESPHomeDevice.query.get(device_id)
        if not device:
            return
        
        device.compilation_status = 'compiling'
        db.session.commit()
        
        try:
            if esphome_manager:
                result = esphome_manager.compile_device(device_name)
                
                if result['success']:
                    device.compilation_status = 'success'
                    device.firmware_version = f"compiled_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                else:
                    device.compilation_status = 'error'
                    print(f"Compilation failed for {device_name}: {result['error']}")
            else:
                device.compilation_status = 'error'
                
        except Exception as e:
            device.compilation_status = 'error'
            print(f"Compilation exception for {device_name}: {e}")
        
        db.session.commit()

@app.route('/api/esphome/devices/<int:device_id>/compile', methods=['POST'])
def compile_esphome_device(device_id):
    """Compile ESPHome device configuration"""
    device = ESPHomeDevice.query.get_or_404(device_id)
    
    device_name = device.name.lower().replace(' ', '_').replace('-', '_')
    device_name = ''.join(c for c in device_name if c.isalnum() or c == '_')
    
    # Start compilation in background
    threading.Thread(
        target=compile_device_background,
        args=(device_id, device_name)
    ).start()
    
    return jsonify({'message': 'Compilation started'})

@app.route('/api/esphome/devices/<int:device_id>/upload', methods=['POST'])
def upload_esphome_firmware(device_id):
    """Upload firmware to ESPHome device"""
    device = ESPHomeDevice.query.get_or_404(device_id)
    
    if device.compilation_status != 'success':
        return jsonify({'error': 'Device must be compiled successfully first'}), 400
    
    device_name = device.name.lower().replace(' ', '_').replace('-', '_')
    device_name = ''.join(c for c in device_name if c.isalnum() or c == '_')
    
    # Start upload in background
    threading.Thread(
        target=upload_device_background,
        args=(device_id, device_name, device.ip_address)
    ).start()
    
    return jsonify({'message': 'Firmware upload started'})

def upload_device_background(device_id, device_name, device_ip):
    """Upload firmware in background thread"""
    with app.app_context():
        device = ESPHomeDevice.query.get(device_id)
        if not device:
            return
        
        try:
            if esphome_manager:
                result = esphome_manager.upload_device(device_name, device_ip)
                
                if result['success']:
                    print(f"Firmware uploaded successfully to {device_name}")
                    # Create corresponding Device and Entity records
                    create_device_from_esphome(device)
                else:
                    print(f"Upload failed for {device_name}: {result['error']}")
            
        except Exception as e:
            print(f"Upload exception for {device_name}: {e}")

@app.route('/api/esphome/discover')
def discover_esphome_devices():
    """Discover ESPHome devices on network"""
    if esphome_manager:
        discovered = esphome_manager.discover_devices()
    else:
        # Fallback mock discovery
        discovered = []
    
    return jsonify(discovered)

@app.route('/api/esphome/devices/<int:device_id>/logs')
def get_esphome_device_logs(device_id):
    """Get device logs (WebSocket endpoint would be better for real-time)"""
    device = ESPHomeDevice.query.get_or_404(device_id)
    
    # This is a simplified implementation
    # In production, you'd want to use WebSockets for real-time logs
    return jsonify({
        'logs': 'Device logs would appear here in real-time implementation',
        'device_name': device.name
    })

@app.route('/api/esphome/devices/<int:device_id>/config')
def get_esphome_device_config(device_id):
    """Get device configuration"""
    device = ESPHomeDevice.query.get_or_404(device_id)
    
    return jsonify({
        'config': device.esphome_config,
        'status': device.compilation_status,
        'created_at': device.created_at.isoformat()
    })

# Initialize ESPHome manager when app starts
@app.before_first_request
def initialize_esphome():
    global esphome_manager
    esphome_manager = init_esphome_manager(app, db)
    print("ESPHome manager initialized")
