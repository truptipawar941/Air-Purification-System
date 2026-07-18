<?php
/**
 * Continuous Data Simulation Runner
 * This script should be run via cron job or continuously in the background
 * It generates new sensor data every 5 seconds when simulation is active
 */

require_once 'api/config.php';

echo "Starting Air Quality Data Simulation Runner...\n";
echo "Press Ctrl+C to stop\n\n";

$flag_file = __DIR__ . '/api/simulation_active.flag';
$running = true;

// Handle shutdown gracefully (simplified version without pcntl)
function shutdown() {
    global $running;
    $running = false;
    echo "\nSimulation runner stopped.\n";
    exit;
}

// Note: For production use, run this script with proper process management
// pcntl_signal functions are not available in standard PHP installations

while ($running) {
    // Check if simulation is active
    if (file_exists($flag_file)) {
        try {
            // Generate sensor data
            $sensor_data = generateRealisticData(100); // Default threshold
            
            // Insert into database
            $insert_query = "INSERT INTO sensor_data (aqi, temperature, humidity, latitude, longitude) 
                             VALUES (?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($insert_query);
            $stmt->bind_param("ddddd", 
                $sensor_data['aqi'], 
                $sensor_data['temperature'], 
                $sensor_data['humidity'], 
                $sensor_data['latitude'], 
                $sensor_data['longitude']
            );
            
            $success = $stmt->execute();
            $stmt->close();
            
            if ($success) {
                echo "[" . date('Y-m-d H:i:s') . "] Generated: AQI={$sensor_data['aqi']}, Temp={$sensor_data['temperature']}°C, Humidity={$sensor_data['humidity']}%\n";
                
                // Check for alerts
                checkAndCreateAlert($conn, $sensor_data);
                
                // Trigger AI simulation
                triggerAISimulation($conn);
            } else {
                echo "[" . date('Y-m-d H:i:s') . "] ERROR: Failed to generate data\n";
            }
            
        } catch (Exception $e) {
            echo "[" . date('Y-m-d H:i:s') . "] ERROR: " . $e->getMessage() . "\n";
        }
    } else {
        echo "[" . date('Y-m-d H:i:s') . "] Simulation inactive. Waiting...\n";
    }
    
    // Wait 5 seconds
    sleep(5);
}

// Helper functions (copied from data_simulator.php)
function generateRealisticData($threshold) {
    global $conn;
    
    // Get current robot status for threshold
    $robot_query = "SELECT aqi_threshold FROM robot_status ORDER BY id DESC LIMIT 1";
    $robot_result = $conn->query($robot_query);
    $threshold = 100; // Default threshold
    
    if ($robot_result->num_rows > 0) {
        $robot_data = $robot_result->fetch_assoc();
        $threshold = $robot_data['aqi_threshold'];
    }
    
    // Simulate different locations in New Delhi
    $locations = [
        ['lat' => 28.6139, 'lng' => 77.2090, 'name' => 'Connaught Place'],
        ['lat' => 28.6170, 'lng' => 77.2120, 'name' => 'Sector 18'],
        ['lat' => 28.6150, 'lng' => 77.2100, 'name' => 'Sector 15'],
        ['lat' => 28.6140, 'lng' => 77.2091, 'name' => 'India Gate'],
        ['lat' => 28.6135, 'lng' => 77.2085, 'name' => 'Sector 12'],
        ['lat' => 28.6138, 'lng' => 77.2089, 'name' => 'Sector 10'],
        ['lat' => 28.6137, 'lng' => 77.2088, 'name' => 'Sector 8'],
        ['lat' => 28.6141, 'lng' => 77.2092, 'name' => 'Sector 6'],
        ['lat' => 28.6136, 'lng' => 77.2087, 'name' => 'Sector 4'],
        ['lat' => 28.6160, 'lng' => 77.2110, 'name' => 'Sector 2']
    ];
    
    $location = $locations[array_rand($locations)];
    
    // Generate AQI with realistic patterns
    $hour = (int)date('H');
    $time_factor = getTimeBasedAQIFactor($hour);
    
    // Add some randomness and location-based variation
    $location_factor = rand(80, 120) / 100; // ±20% location variation
    $random_factor = rand(90, 110) / 100; // ±10% random variation
    
    // Base AQI with time-based variation
    $base_aqi = 75 + ($hour >= 7 && $hour <= 9 ? 30 : 0) + ($hour >= 17 && $hour <= 19 ? 40 : 0);
    $aqi = $base_aqi * $time_factor * $location_factor * $random_factor;
    
    // Ensure AQI stays within realistic bounds
    $aqi = max(20, min(400, $aqi));
    
    // Generate temperature (based on time of day)
    $temp_base = 25; // Base temperature in Delhi
    $temp_variation = getTemperatureVariation($hour);
    $temperature = $temp_base + $temp_variation + (rand(-20, 20) / 10); // ±2 degrees
    
    // Generate humidity (inversely related to temperature)
    $humidity_base = 60;
    $humidity_variation = -$temp_variation * 2; // Humidity drops when temperature rises
    $humidity = $humidity_base + $humidity_variation + (rand(-10, 10));
    $humidity = max(20, min(95, $humidity));
    
    return [
        'aqi' => round($aqi, 1),
        'temperature' => round($temperature, 1),
        'humidity' => round($humidity, 1),
        'latitude' => $location['lat'] + (rand(-50, 50) / 100000), // Small variation
        'longitude' => $location['lng'] + (rand(-50, 50) / 100000),
        'location_name' => $location['name']
    ];
}

function getTimeBasedAQIFactor($hour) {
    if ($hour >= 6 && $hour <= 8) return 1.3; // Morning rush hour
    elseif ($hour >= 9 && $hour <= 11) return 1.1; // Mid morning
    elseif ($hour >= 12 && $hour <= 16) return 0.9; // Afternoon dispersion
    elseif ($hour >= 17 && $hour <= 19) return 1.4; // Evening rush hour
    else return 0.8; // Night time
}

function getTemperatureVariation($hour) {
    if ($hour >= 6 && $hour <= 14) {
        return ($hour - 6) * 1.5; // Up to +12 degrees by 2 PM
    } elseif ($hour > 14 && $hour <= 20) {
        return 12 - (($hour - 14) * 2); // Down to +2 degrees by 8 PM
    } else {
        return -2; // Below base temperature
    }
}

function checkAndCreateAlert($conn, $sensor_data) {
    // Get current threshold
    $robot_query = "SELECT aqi_threshold FROM robot_status ORDER BY id DESC LIMIT 1";
    $robot_result = $conn->query($robot_query);
    $threshold = 100; // Default threshold
    
    if ($robot_result->num_rows > 0) {
        $robot_data = $robot_result->fetch_assoc();
        $threshold = $robot_data['aqi_threshold'];
    }
    
    if ($sensor_data['aqi'] > $threshold) {
        $alert_level = 'WARNING';
        if ($sensor_data['aqi'] > 200) $alert_level = 'ERROR';
        if ($sensor_data['aqi'] > 300) $alert_level = 'CRITICAL';
        
        $alert_message = sprintf('High AQI detected: %.1f at %s', 
            $sensor_data['aqi'], 
            $sensor_data['location_name'] ?? 'Unknown location'
        );
        
        $alert_query = "INSERT INTO alerts (message, level, aqi_value, location) 
                       VALUES (?, ?, ?, ?)";
        
        $stmt = $conn->prepare($alert_query);
        $location = $sensor_data['location_name'] ?? sprintf('%.6f, %.6f', 
            $sensor_data['latitude'], $sensor_data['longitude']);
        $stmt->bind_param("ssds", $alert_message, $alert_level, $sensor_data['aqi'], $location);
        $stmt->execute();
        $stmt->close();
    }
}

function triggerAISimulation($conn) {
    // Call AI simulation to make decisions based on new data
    $ai_url = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/api/ai_simulation.php';
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode(['trigger' => 'data_simulation'])
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);
    
    // Make async call (non-blocking)
    $result = file_get_contents($ai_url, false, $context);
    
    // Log the trigger
    $log_query = "INSERT INTO system_logs (action, details, user_id) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($log_query);
    $action = 'Data Simulation Triggered';
    $details = 'AI simulation triggered after data generation';
    $user_id = 'simulation_system';
    $stmt->bind_param("sss", $action, $details, $user_id);
    $stmt->execute();
    $stmt->close();
}

$conn->close();
?>
