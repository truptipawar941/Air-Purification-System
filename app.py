#!/usr/bin/env python3
"""
AI-Powered Air Purification System
Flask API for Machine Learning and AI Decision Making
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import logging
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import joblib
import os

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'air_purification_system'
}

# Global variables for ML model
aqi_model = None
scaler = None
model_trained = False

class DatabaseManager:
    """Database connection and operations manager"""
    
    def __init__(self):
        self.connection = None
    
    def connect(self):
        try:
            self.connection = mysql.connector.connect(**DB_CONFIG)
            return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def disconnect(self):
        if self.connection and self.connection.is_connected():
            self.connection.close()
    
    def execute_query(self, query, params=None):
        if not self.connection or not self.connection.is_connected():
            self.connect()
        
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, params or ())
            result = cursor.fetchall()
            self.connection.commit()
            return result
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            self.connection.rollback()
            return []
        finally:
            cursor.close()
    
    def get_sensor_data(self, hours=24):
        """Get sensor data for ML training"""
        query = """
            SELECT aqi, temperature, humidity, 
                   TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_ago
            FROM sensor_data 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL %s HOUR)
            ORDER BY created_at DESC
            LIMIT 100
        """
        return self.execute_query(query, (hours,))
    
    def get_location_data(self):
        """Get current AQI by location for routing"""
        query = """
            SELECT latitude, longitude, aqi, created_at
            FROM sensor_data 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY created_at DESC
            LIMIT 20
        """
        return self.execute_query(query)
    
    def save_prediction(self, predicted_aqi, confidence=0.85):
        """Save AI prediction to database"""
        query = """
            INSERT INTO predictions (predicted_aqi, confidence, created_at)
            VALUES (%s, %s, NOW())
        """
        self.execute_query(query, (predicted_aqi, confidence))
    
    def save_ai_decision(self, decision, reason):
        """Save AI decision to database"""
        query = """
            INSERT INTO ai_logs (decision, reason, created_at)
            VALUES (%s, %s, NOW())
        """
        self.execute_query(query, (decision, reason))

class AQIPredictor:
    """AQI Prediction using Machine Learning"""
    
    def __init__(self):
        self.model = LinearRegression()
        self.scaler = StandardScaler()
        self.trained = False
    
    def train(self, data):
        """Train the AQI prediction model"""
        if len(data) < 10:
            logger.warning("Insufficient data for training")
            return False
        
        try:
            # Prepare features
            df = pd.DataFrame(data)
            
            # Feature engineering
            df['hour'] = pd.to_datetime(df['created_at']).dt.hour
            df['temp_humidity_ratio'] = df['temperature'] / (df['humidity'] + 1)
            df['aqi_temp_ratio'] = df['aqi'] / (df['temperature'] + 1)
            
            # Features for prediction
            features = ['aqi', 'temperature', 'humidity', 'minutes_ago', 'hour', 'temp_humidity_ratio']
            target = 'aqi_future'
            
            # Create target (next AQI value)
            df[target] = df['aqi'].shift(-1)
            df = df.dropna()
            
            if len(df) < 10:
                logger.warning("Insufficient data after preprocessing")
                return False
            
            X = df[features].values
            y = df[target].values
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model
            self.model.fit(X_scaled, y)
            self.trained = True
            
            # Save model
            joblib.dump(self.model, 'ai/aqi_model.pkl')
            joblib.dump(self.scaler, 'ai/scaler.pkl')
            
            logger.info(f"Model trained with {len(df)} samples")
            return True
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            return False
    
    def load_model(self):
        """Load pre-trained model"""
        try:
            if os.path.exists('ai/aqi_model.pkl'):
                self.model = joblib.load('ai/aqi_model.pkl')
                self.scaler = joblib.load('ai/scaler.pkl')
                self.trained = True
                logger.info("Pre-trained model loaded")
                return True
        except Exception as e:
            logger.error(f"Model loading failed: {e}")
            return False
    
    def predict(self, current_data):
        """Predict future AQI values"""
        if not self.trained:
            return self._fallback_prediction(current_data)
        
        try:
            # Prepare features
            features = self._prepare_features(current_data)
            if not features:
                return self._fallback_prediction(current_data)
            
            # Scale features
            features_scaled = self.scaler.transform([features])
            
            # Predict
            prediction = self.model.predict(features_scaled)[0]
            prediction = max(20, min(400, prediction))  # Clamp to realistic range
            
            return {
                'predicted_aqi_15min': round(prediction, 1),
                'predicted_aqi_30min': round(prediction * 1.1, 1),
                'predicted_aqi_1hour': round(prediction * 1.2, 1),
                'confidence': 0.85,
                'model_used': 'linear_regression'
            }
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return self._fallback_prediction(current_data)
    
    def _prepare_features(self, data):
        """Prepare features for prediction"""
        if not data:
            return None
        
        latest = data[0]
        current_time = datetime.now()
        
        return [
            latest['aqi'],
            latest['temperature'],
            latest['humidity'],
            0,  # minutes_ago for current data
            current_time.hour,
            latest['temperature'] / (latest['humidity'] + 1)
        ]
    
    def _fallback_prediction(self, data):
        """Fallback prediction when model fails"""
        if not data:
            return {'predicted_aqi_15min': 75, 'confidence': 0.5, 'model_used': 'fallback'}
        
        latest = data[0]
        # Simple trend-based prediction
        hour = datetime.now().hour
        
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            # Rush hours - AQI likely to increase
            predicted = latest['aqi'] * 1.15
        else:
            # Off-peak hours - AQI likely to decrease
            predicted = latest['aqi'] * 0.9
        
        return {
            'predicted_aqi_15min': round(predicted, 1),
            'predicted_aqi_30min': round(predicted * 1.1, 1),
            'predicted_aqi_1hour': round(predicted * 1.2, 1),
            'confidence': 0.6,
            'model_used': 'trend_based'
        }

class SmartDecisionEngine:
    """AI-based decision making for robot actions"""
    
    def __init__(self):
        self.threshold = 100
    
    def make_decision(self, current_aqi, predicted_aqi, robot_status):
        """Make intelligent robot decision"""
        decision = {
            'action': 'monitor',
            'reason': 'Normal conditions',
            'spray_intensity': 'OFF',
            'urgency': 'low',
            'estimated_time': 0
        }
        
        # High current AQI
        if current_aqi > self.threshold:
            decision.update({
                'action': 'activate_purification',
                'reason': f'High AQI detected: {current_aqi}',
                'spray_intensity': self._get_spray_intensity(current_aqi),
                'urgency': 'high',
                'estimated_time': 5
            })
        
        # Predicted high AQI (proactive)
        elif predicted_aqi > self.threshold:
            decision.update({
                'action': 'move_to_high_aqi',
                'reason': f'Predicted high AQI: {predicted_aqi}',
                'spray_intensity': 'STANDBY',
                'urgency': 'medium',
                'estimated_time': 15
            })
        
        # Anomaly detection
        anomaly = self._detect_anomaly(current_aqi, predicted_aqi)
        if anomaly:
            decision.update({
                'action': 'investigate_anomaly',
                'reason': 'Unusual AQI pattern detected',
                'spray_intensity': 'HIGH',
                'urgency': 'high',
                'estimated_time': 2
            })
        
        return decision
    
    def _get_spray_intensity(self, aqi):
        """Determine spray intensity based on AQI level"""
        if aqi > 200:
            return 'HIGH'
        elif aqi > 150:
            return 'MEDIUM'
        elif aqi > 100:
            return 'LOW'
        else:
            return 'OFF'
    
    def _detect_anomaly(self, current_aqi, predicted_aqi):
        """Detect anomalies in AQI readings"""
        if not current_aqi or not predicted_aqi:
            return False
        
        # Simple anomaly detection: sudden spikes
        difference = abs(current_aqi - predicted_aqi)
        threshold = current_aqi * 0.3  # 30% difference threshold
        
        return difference > threshold

class RouteOptimizer:
    """AI-based route optimization for robot movement"""
    
    def __init__(self):
        pass
    
    def optimize_route(self, locations_data):
        """Optimize robot route based on AQI and distance"""
        if not locations_data:
            return None
        
        # Calculate priority score for each location
        optimized_locations = []
        base_lat, base_lng = 28.6139, 77.2090  # Base location
        
        for location in locations_data:
            distance = self._calculate_distance(base_lat, base_lng, 
                                        location['latitude'], location['longitude'])
            
            # Priority = AQI score - distance penalty
            priority_score = location['aqi'] - (distance * 10)
            
            optimized_locations.append({
                'latitude': location['latitude'],
                'longitude': location['longitude'],
                'aqi': location['aqi'],
                'distance': distance,
                'priority_score': priority_score,
                'estimated_time': distance * 2  # 2 minutes per km
            })
        
        # Sort by priority score (highest first)
        optimized_locations.sort(key=lambda x: x['priority_score'], reverse=True)
        
        return {
            'route': optimized_locations[:5],  # Top 5 locations
            'total_time': sum(loc['estimated_time'] for loc in optimized_locations[:5]),
            'optimization_method': 'priority_distance_algorithm'
        }
    
    def _calculate_distance(self, lat1, lng1, lat2, lng2):
        """Calculate distance between two coordinates (simplified)"""
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth's radius in km
        r = 6371
        return c * r

# Initialize components
db = DatabaseManager()
aqi_predictor = AQIPredictor()
decision_engine = SmartDecisionEngine()
route_optimizer = RouteOptimizer()

# Load pre-trained model if available
aqi_predictor.load_model()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model_trained': aqi_predictor.trained,
        'database_connected': db.connect()
    })

@app.route('/predict', methods=['POST'])
def predict_aqi():
    """AQI prediction endpoint"""
    try:
        data = request.get_json()
        
        # Get recent sensor data
        sensor_data = db.get_sensor_data(hours=6)
        
        if not sensor_data:
            return jsonify({
                'success': False,
                'error': 'No sensor data available'
            }), 400
        
        # Train model if not trained
        if not aqi_predictor.trained and len(sensor_data) >= 10:
            aqi_predictor.train(sensor_data)
        
        # Make prediction
        prediction = aqi_predictor.predict(sensor_data)
        
        # Save prediction to database
        if 'predicted_aqi_15min' in prediction:
            db.save_prediction(prediction['predicted_aqi_15min'], prediction['confidence'])
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/decision', methods=['POST'])
def make_decision():
    """AI decision making endpoint"""
    try:
        data = request.get_json()
        current_aqi = data.get('current_aqi', 0)
        predicted_aqi = data.get('predicted_aqi', 0)
        robot_status = data.get('robot_status', {})
        
        # Make AI decision
        decision = decision_engine.make_decision(current_aqi, predicted_aqi, robot_status)
        
        # Save decision to database
        db.save_ai_decision(decision['action'], decision['reason'])
        
        return jsonify({
            'success': True,
            'decision': decision,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Decision error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/anomaly', methods=['POST'])
def detect_anomaly():
    """Anomaly detection endpoint"""
    try:
        data = request.get_json()
        sensor_data = db.get_sensor_data(hours=1)
        
        if not sensor_data:
            return jsonify({
                'success': False,
                'error': 'No sensor data available'
            }), 400
        
        # Detect anomalies
        anomalies = []
        for i, reading in enumerate(sensor_data[:-1]):
            next_reading = sensor_data[i + 1]
            difference = abs(next_reading['aqi'] - reading['aqi'])
            
            if difference > reading['aqi'] * 0.3:  # 30% spike
                anomalies.append({
                    'timestamp': next_reading['created_at'],
                    'aqi': next_reading['aqi'],
                    'difference': difference,
                    'severity': 'high' if difference > reading['aqi'] * 0.5 else 'medium'
                })
        
        return jsonify({
            'success': True,
            'anomalies': anomalies,
            'anomaly_count': len(anomalies),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/optimize_route', methods=['POST'])
def optimize_route():
    """Route optimization endpoint"""
    try:
        # Get location data
        locations_data = db.get_location_data()
        
        if not locations_data:
            return jsonify({
                'success': False,
                'error': 'No location data available'
            }), 400
        
        # Optimize route
        route = route_optimizer.optimize_route(locations_data)
        
        return jsonify({
            'success': True,
            'route': route,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Route optimization error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/train_model', methods=['POST'])
def train_model():
    """Train ML model endpoint"""
    try:
        # Get training data
        sensor_data = db.get_sensor_data(hours=168)  # 1 week of data
        
        if len(sensor_data) < 50:
            return jsonify({
                'success': False,
                'error': 'Insufficient data for training (need at least 50 readings)'
            }), 400
        
        # Train model
        success = aqi_predictor.train(sensor_data)
        
        return jsonify({
            'success': success,
            'message': 'Model trained successfully' if success else 'Training failed',
            'data_points': len(sensor_data),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Model training error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/heatmap_data', methods=['GET'])
def get_heatmap_data():
    """Prepare data for heatmap visualization"""
    try:
        # Get location data for heatmap
        query = """
            SELECT latitude, longitude, aqi, created_at
            FROM sensor_data 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY created_at DESC
            LIMIT 50
        """
        locations = db.execute_query(query)
        
        # Aggregate by location grid (simplified)
        heatmap_data = {}
        for location in locations:
            # Round coordinates to create grid
            lat_grid = round(location['latitude'], 3)
            lng_grid = round(location['longitude'], 3)
            grid_key = f"{lat_grid},{lng_grid}"
            
            if grid_key not in heatmap_data:
                heatmap_data[grid_key] = {
                    'lat': lat_grid,
                    'lng': lng_grid,
                    'aqi_values': [],
                    'avg_aqi': 0,
                    'count': 0
                }
            
            heatmap_data[grid_key]['aqi_values'].append(location['aqi'])
            heatmap_data[grid_key]['count'] += 1
        
        # Calculate averages
        for key, data in heatmap_data.items():
            if data['aqi_values']:
                data['avg_aqi'] = sum(data['aqi_values']) / len(data['aqi_values'])
                data['max_aqi'] = max(data['aqi_values'])
                del data['aqi_values']  # Remove raw values
        
        return jsonify({
            'success': True,
            'heatmap_data': list(heatmap_data.values()),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Heatmap data error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Create ai directory if it doesn't exist
    os.makedirs('ai', exist_ok=True)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
