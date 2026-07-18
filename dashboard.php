<?php
session_start();

// Check if logged in
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header('Location: login.php');
    exit();
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: login.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Air Quality Monitoring</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gaugeJS@1.3.7/dist/gauge.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        * {
            font-family: 'Inter', sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            min-height: 100vh;
        }
        
        .glassmorphism {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        
        .sidebar-item {
            transition: all 0.3s ease;
        }
        
        .sidebar-item:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateX(5px);
        }
        
        .sidebar-item.active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-left: 4px solid #667eea;
        }
        
        .gauge-container {
            position: relative;
            width: 200px;
            height: 200px;
            margin: 0 auto;
        }
        
        .status-good { background: linear-gradient(135deg, #10b981, #059669); }
        .status-moderate { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .status-unhealthy { background: linear-gradient(135deg, #f97316, #ea580c); }
        .status-dangerous { background: linear-gradient(135deg, #ef4444, #dc2626); }
        
        .pulse-animation {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .data-card {
            transition: all 0.3s ease;
        }
        
        .data-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5);
        }
        
        .live-indicator {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            display: inline-block;
            animation: pulse 2s infinite;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            
            .sidebar.open {
                transform: translateX(0);
            }
        }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <!-- Sidebar -->
    <div id="sidebar" class="sidebar fixed left-0 top-0 h-full w-64 glassmorphism p-6 z-50">
        <!-- Logo -->
        <div class="flex items-center space-x-3 mb-8">
            <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <i class="fas fa-wind text-white text-xl"></i>
            </div>
            <div>
                <h2 class="text-white font-bold text-lg">Air Quality</h2>
                <p class="text-gray-400 text-xs">Monitoring System</p>
            </div>
        </div>
        
        <!-- Navigation -->
        <nav class="space-y-2 mb-8">
            <a href="#dashboard" class="sidebar-item active block text-white p-3 rounded-lg">
                <i class="fas fa-tachometer-alt mr-3"></i>Dashboard
            </a>
            <a href="#sensor-data" class="sidebar-item block text-white p-3 rounded-lg">
                <i class="fas fa-microchip mr-3"></i>Sensor Data
            </a>
            <a href="#analytics" class="sidebar-item block text-white p-3 rounded-lg">
                <i class="fas fa-chart-line mr-3"></i>Analytics
            </a>
            <a href="#settings" class="sidebar-item block text-white p-3 rounded-lg">
                <i class="fas fa-cog mr-3"></i>Settings
            </a>
        </nav>
        
        <!-- User Info -->
        <div class="absolute bottom-6 left-6 right-6">
            <div class="glassmorphism p-4 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-white text-sm"></i>
                        </div>
                        <div>
                            <p class="text-white font-semibold"><?php echo htmlspecialchars($_SESSION['admin_username']); ?></p>
                            <p class="text-gray-400 text-xs">Administrator</p>
                        </div>
                    </div>
                </div>
                <a href="?logout" class="block w-full bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-300 py-2 rounded-lg text-center transition-all">
                    <i class="fas fa-sign-out-alt mr-2"></i>Logout
                </a>
            </div>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="ml-64 p-6">
        <!-- Topbar -->
        <header class="glassmorphism rounded-2xl p-6 mb-6 flex justify-between items-center">
            <div>
                <h1 class="text-3xl font-bold text-white mb-2">Air Quality Monitoring</h1>
                <p class="text-gray-400">Real-time sensor data dashboard</p>
            </div>
            <div class="flex items-center space-x-4">
                <div class="text-right">
                    <p class="text-sm text-gray-400">Last Updated</p>
                    <p class="text-white font-semibold" id="last-updated">--:--:--</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="live-indicator"></span>
                    <span class="text-green-400 text-sm">Live</span>
                </div>
            </div>
        </header>
        
        <!-- Dashboard Content -->
        <main id="dashboard-content">
            <!-- Status Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <!-- Temperature Card -->
                <div class="data-card glassmorphism rounded-2xl p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <p class="text-gray-400 text-sm">Temperature</p>
                            <p class="text-3xl font-bold text-white" id="temp-value">--</p>
                        </div>
                        <div class="w-12 h-12 bg-orange-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                            <i class="fas fa-thermometer-half text-orange-400 text-xl"></i>
                        </div>
                    </div>
                    <div class="text-sm text-gray-400">
                        <span id="temp-status">--</span>
                    </div>
                </div>
                
                <!-- Humidity Card -->
                <div class="data-card glassmorphism rounded-2xl p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <p class="text-gray-400 text-sm">Humidity</p>
                            <p class="text-3xl font-bold text-white" id="humidity-value">--</p>
                        </div>
                        <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                            <i class="fas fa-tint text-blue-400 text-xl"></i>
                        </div>
                    </div>
                    <div class="text-sm text-gray-400">
                        <span id="humidity-status">--</span>
                    </div>
                </div>
                
                <!-- MQ Gas Card -->
                <div class="data-card glassmorphism rounded-2xl p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <p class="text-gray-400 text-sm">MQ Gas</p>
                            <p class="text-3xl font-bold text-white" id="mq-value">--</p>
                        </div>
                        <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                            <i class="fas fa-smog text-green-400 text-xl"></i>
                        </div>
                    </div>
                    <div class="text-sm text-gray-400">
                        <span id="mq-status">--</span>
                    </div>
                </div>
                
                <!-- AQI Card -->
                <div class="data-card glassmorphism rounded-2xl p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <p class="text-gray-400 text-sm">Air Quality Index</p>
                            <p class="text-3xl font-bold text-white" id="aqi-value">--</p>
                        </div>
                        <div class="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                            <i class="fas fa-lungs text-purple-400 text-xl"></i>
                        </div>
                    </div>
                    <div class="text-sm">
                        <span id="aqi-status" class="px-3 py-1 rounded-full text-xs font-semibold">--</span>
                    </div>
                </div>
            </div>
            
            <!-- Gauges Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                <!-- Temperature Gauge -->
                <div class="glassmorphism rounded-2xl p-6">
                    <h3 class="text-lg font-semibold text-white mb-4 text-center">Temperature</h3>
                    <div class="gauge-container">
                        <canvas id="temp-gauge"></canvas>
                    </div>
                    <div class="text-center mt-4">
                        <span class="text-2xl font-bold text-white" id="temp-gauge-value">--°C</span>
                    </div>
                </div>
                
                <!-- Humidity Gauge -->
                <div class="glassmorphism rounded-2xl p-6">
                    <h3 class="text-lg font-semibold text-white mb-4 text-center">Humidity</h3>
                    <div class="gauge-container">
                        <canvas id="humidity-gauge"></canvas>
                    </div>
                    <div class="text-center mt-4">
                        <span class="text-2xl font-bold text-white" id="humidity-gauge-value">--%</span>
                    </div>
                </div>
                
                <!-- MQ Gas Gauge -->
                <div class="glassmorphism rounded-2xl p-6">
                    <h3 class="text-lg font-semibold text-white mb-4 text-center">MQ Gas Level</h3>
                    <div class="gauge-container">
                        <canvas id="mq-gauge"></canvas>
                    </div>
                    <div class="text-center mt-4">
                        <span class="text-2xl font-bold text-white" id="mq-gauge-value">--</span>
                    </div>
                </div>
                
                <!-- AQI Gauge -->
                <div class="glassmorphism rounded-2xl p-6">
                    <h3 class="text-lg font-semibold text-white mb-4 text-center">Air Quality Index</h3>
                    <div class="gauge-container">
                        <canvas id="aqi-gauge"></canvas>
                    </div>
                    <div class="text-center mt-4">
                        <span class="text-2xl font-bold text-white" id="aqi-gauge-value">--</span>
                    </div>
                </div>
            </div>
            
            <!-- Live Chart -->
            <div class="glassmorphism rounded-2xl p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-white">Live Sensor Data</h3>
                    <div class="flex items-center space-x-4">
                        <div class="flex space-x-2">
                            <button onclick="toggleChart('temperature')" class="chart-toggle px-3 py-1 bg-orange-500 bg-opacity-20 text-orange-400 rounded-lg text-sm" data-chart="temperature">
                                Temperature
                            </button>
                            <button onclick="toggleChart('humidity')" class="chart-toggle px-3 py-1 bg-blue-500 bg-opacity-20 text-blue-400 rounded-lg text-sm" data-chart="humidity">
                                Humidity
                            </button>
                            <button onclick="toggleChart('mq')" class="chart-toggle px-3 py-1 bg-green-500 bg-opacity-20 text-green-400 rounded-lg text-sm" data-chart="mq">
                                MQ Gas
                            </button>
                            <button onclick="toggleChart('aqi')" class="chart-toggle px-3 py-1 bg-purple-500 bg-opacity-20 text-purple-400 rounded-lg text-sm active" data-chart="aqi">
                                AQI
                            </button>
                        </div>
                    </div>
                </div>
                <div class="relative" style="height: 400px;">
                    <canvas id="live-chart"></canvas>
                </div>
            </div>
        </main>
    </div>
    
    <!-- Mobile Menu Toggle -->
    <button id="mobile-menu-toggle" class="md:hidden fixed top-4 left-4 z-50 bg-purple-500 p-3 rounded-lg">
        <i class="fas fa-bars text-white"></i>
    </button>
    
    <script src="dashboard.js"></script>
</body>
</html>
