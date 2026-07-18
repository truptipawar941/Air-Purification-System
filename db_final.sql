-- AI-Powered Air Purification System Database Schema
-- Final Production Version

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS air_purification_system;
USE air_purification_system;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS robot_status;
DROP TABLE IF EXISTS sensor_data;

-- Table for storing sensor data
CREATE TABLE sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aqi DECIMAL(5,2) NOT NULL COMMENT 'Air Quality Index value',
    temperature DECIMAL(5,2) NOT NULL COMMENT 'Temperature in Celsius',
    humidity DECIMAL(5,2) NOT NULL COMMENT 'Humidity percentage',
    latitude DECIMAL(10,8) NOT NULL COMMENT 'GPS latitude',
    longitude DECIMAL(11,8) NOT NULL COMMENT 'GPS longitude',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_aqi (aqi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for robot status and control
CREATE TABLE robot_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status ENUM('ON', 'OFF') NOT NULL DEFAULT 'OFF' COMMENT 'Robot power status',
    mode ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'MANUAL' COMMENT 'Control mode',
    spray_status ENUM('ON', 'OFF') NOT NULL DEFAULT 'OFF' COMMENT 'Spray system status',
    aqi_threshold INT NOT NULL DEFAULT 100 COMMENT 'AQI threshold for auto activation',
    current_latitude DECIMAL(10,8) DEFAULT NULL COMMENT 'Current robot latitude',
    current_longitude DECIMAL(11,8) DEFAULT NULL COMMENT 'Current robot longitude',
    target_latitude DECIMAL(10,8) DEFAULT NULL COMMENT 'Target destination latitude',
    target_longitude DECIMAL(11,8) DEFAULT NULL COMMENT 'Target destination longitude',
    battery_level INT DEFAULT 100 COMMENT 'Battery percentage',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_mode (mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for system alerts and notifications
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(255) NOT NULL COMMENT 'Alert message',
    level ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL DEFAULT 'INFO' COMMENT 'Alert severity level',
    aqi_value DECIMAL(5,2) DEFAULT NULL COMMENT 'AQI value that triggered alert',
    location VARCHAR(100) DEFAULT NULL COMMENT 'Location where alert was triggered',
    is_read BOOLEAN DEFAULT FALSE COMMENT 'Whether alert has been read',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level (level),
    INDEX idx_created_at (created_at),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for system logs and activities
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL COMMENT 'Action performed',
    details TEXT DEFAULT NULL COMMENT 'Additional details about the action',
    user_id VARCHAR(50) DEFAULT 'system' COMMENT 'User who performed the action',
    ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP address of the user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default robot status
INSERT INTO robot_status (status, mode, spray_status, aqi_threshold, current_latitude, current_longitude) 
VALUES ('OFF', 'MANUAL', 'OFF', 100, 28.6139, 77.2090);

-- Insert comprehensive sample sensor data for testing
INSERT INTO sensor_data (aqi, temperature, humidity, latitude, longitude, created_at) VALUES
-- Recent data (last 2 hours)
(45, 25.5, 60, 28.6139, 77.2090, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(52, 26.0, 58, 28.6140, 77.2091, DATE_SUB(NOW(), INTERVAL 1 HOUR 50 MINUTE)),
(38, 24.8, 62, 28.6138, 77.2089, DATE_SUB(NOW(), INTERVAL 1 HOUR 40 MINUTE)),
(125, 27.2, 55, 28.6150, 77.2100, DATE_SUB(NOW(), INTERVAL 1 HOUR 30 MINUTE)),
(89, 25.9, 59, 28.6135, 77.2085, DATE_SUB(NOW(), INTERVAL 1 HOUR 20 MINUTE)),
(156, 28.1, 52, 28.6160, 77.2110, DATE_SUB(NOW(), INTERVAL 1 HOUR 10 MINUTE)),
(67, 26.3, 57, 28.6137, 77.2088, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(43, 25.1, 61, 28.6141, 77.2092, DATE_SUB(NOW(), INTERVAL 50 MINUTE)),
(201, 29.0, 48, 28.6170, 77.2120, DATE_SUB(NOW(), INTERVAL 40 MINUTE)),
(78, 26.8, 56, 28.6136, 77.2087, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(92, 27.1, 54, 28.6145, 77.2095, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(58, 25.7, 59, 28.6134, 77.2084, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(41, 24.9, 63, 28.6142, 77.2093, DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
(73, 26.5, 56, 28.6138, 77.2090, DATE_SUB(NOW(), INTERVAL 2 MINUTE)),
(65, 25.8, 58, 28.6140, 77.2091, NOW()),

-- Historical data for analytics (last 24 hours)
(55, 26.2, 57, 28.6143, 77.2094, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(48, 25.4, 61, 28.6136, 77.2086, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(82, 27.0, 55, 28.6152, 77.2102, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(71, 26.8, 56, 28.6139, 77.2090, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(39, 24.7, 64, 28.6135, 77.2083, DATE_SUB(NOW(), INTERVAL 7 HOUR)),
(95, 27.5, 53, 28.6165, 77.2115, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(63, 26.0, 58, 28.6141, 77.2092, DATE_SUB(NOW(), INTERVAL 9 HOUR)),
(76, 27.2, 54, 28.6138, 77.2089, DATE_SUB(NOW(), INTERVAL 10 HOUR)),
(51, 25.9, 60, 28.6144, 77.2096, DATE_SUB(NOW(), INTERVAL 11 HOUR)),
(68, 26.4, 57, 28.6137, 77.2087, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(44, 25.2, 62, 28.6139, 77.2090, DATE_SUB(NOW(), INTERVAL 13 HOUR)),
(87, 27.1, 55, 28.6153, 77.2103, DATE_SUB(NOW(), INTERVAL 14 HOUR)),
(59, 26.1, 59, 28.6140, 77.2091, DATE_SUB(NOW(), INTERVAL 15 HOUR)),
(72, 26.7, 56, 28.6138, 77.2089, DATE_SUB(NOW(), INTERVAL 16 HOUR)),
(46, 25.3, 61, 28.6142, 77.2093, DATE_SUB(NOW(), INTERVAL 17 HOUR)),
(79, 26.9, 55, 28.6136, 77.2085, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(53, 25.8, 60, 28.6141, 77.2092, DATE_SUB(NOW(), INTERVAL 19 HOUR)),
(66, 26.5, 57, 28.6139, 77.2090, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(41, 24.9, 63, 28.6137, 77.2088, DATE_SUB(NOW(), INTERVAL 21 HOUR)),
(74, 26.8, 56, 28.6143, 77.2094, DATE_SUB(NOW(), INTERVAL 22 HOUR)),
(57, 26.0, 59, 28.6138, 77.2089, DATE_SUB(NOW(), INTERVAL 23 HOUR)),
(69, 26.6, 57, 28.6140, 77.2091, DATE_SUB(NOW(), INTERVAL 24 HOUR));

-- Insert sample alerts
INSERT INTO alerts (message, level, aqi_value, location, is_read) VALUES
('High AQI detected in area', 'WARNING', 156, 'Sector 15', FALSE),
('AQI levels critical - Immediate action required', 'CRITICAL', 201, 'Sector 18', FALSE),
('Air quality improving', 'INFO', 45, 'Sector 12', TRUE),
('Moderate air quality - Monitor closely', 'WARNING', 89, 'Sector 10', FALSE),
('Robot battery low', 'WARNING', NULL, 'Robot Location', TRUE),
('System started successfully', 'INFO', NULL, 'System', TRUE),
('Spray system activated', 'INFO', 125, 'Sector 15', FALSE),
('Temperature spike detected', 'WARNING', 29.0, 'Sector 18', FALSE);

-- Insert sample system logs
INSERT INTO system_logs (action, details, user_id, ip_address) VALUES
('Robot started', 'Robot activated in AUTO mode', 'admin', '127.0.0.1'),
('Spray system activated', 'Purification spray started due to high AQI', 'system', '127.0.0.1'),
('Threshold updated', 'AQI threshold changed from 100 to 120', 'admin', '127.0.0.1'),
('Robot moved', 'Robot moved to new location for purification', 'system', '127.0.0.1'),
('Data received', 'New sensor data received from device', 'sensor_device', '192.168.1.100'),
('Alert generated', 'High AQI alert automatically generated', 'system', '127.0.0.1'),
('Mode changed', 'Robot mode changed from MANUAL to AUTO', 'admin', '127.0.0.1'),
('System initialized', 'Database initialized with default values', 'system', '127.0.0.1');

-- Create a data simulation trigger (optional - for automatic data generation)
DELIMITER //
CREATE TRIGGER IF NOT EXISTS simulate_data_trigger
AFTER INSERT ON sensor_data
FOR EACH ROW
BEGIN
    -- Auto-generate alerts for high AQI readings
    IF NEW.aqi > 150 THEN
        INSERT INTO alerts (message, level, aqi_value, location)
        VALUES (
            CONCAT('High AQI detected: ', NEW.aqi),
            IF(NEW.aqi > 200, 'CRITICAL', 'ERROR'),
            NEW.aqi,
            CONCAT(NEW.latitude, ', ', NEW.longitude)
        );
    END IF;
    
    -- Log system activity
    INSERT INTO system_logs (action, details, user_id)
    VALUES (
        'Sensor data recorded',
        CONCAT('AQI: ', NEW.aqi, ', Temp: ', NEW.temperature, '°C, Humidity: ', NEW.humidity, '%'),
        'sensor_device'
    );
END//
DELIMITER ;

-- Show final database structure
SHOW TABLES;

-- Display sample data counts
SELECT 
    'sensor_data' as table_name, COUNT(*) as record_count FROM sensor_data
UNION ALL
SELECT 
    'robot_status' as table_name, COUNT(*) as record_count FROM robot_status
UNION ALL
SELECT 
    'alerts' as table_name, COUNT(*) as record_count FROM alerts
UNION ALL
SELECT 
    'system_logs' as table_name, COUNT(*) as record_count FROM system_logs;
