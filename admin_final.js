// Admin Dashboard JavaScript - Final Production Version
// Global variables
let currentSection = 'overview';
let aqiChart = null;
let tempHumidityChart = null;
let autoRefreshInterval = null;
let robotStatus = null;
let isRefreshing = false;

// Base URL for API calls
const API_BASE = 'api/';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard initializing...');
    initializeDashboard();
    startAutoRefresh();
    setupErrorHandling();
});

function setupErrorHandling() {
    // Global error handler for fetch requests
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showToast('Network error occurred. Please check your connection.', 'error');
    });
}

function initializeDashboard() {
    console.log('Initializing dashboard components...');
    showSection('overview');
    refreshData();
    initializeCharts();
}

// Section management
function showSection(sectionId, eventElement = null) {
    console.log('Switching to section:', sectionId);
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    } else {
        console.error('Section not found:', sectionId);
        return;
    }
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('bg-white', 'bg-opacity-20');
    });
    
    // Update active state if event element is provided
    if (eventElement && eventElement.closest) {
        const sidebarItem = eventElement.closest('.sidebar-item');
        if (sidebarItem) {
            sidebarItem.classList.add('bg-white', 'bg-opacity-20');
        }
    } else {
        // Find and activate the sidebar item for the current section
        const sidebarLink = document.querySelector(`a[href="#${sectionId}"]`);
        if (sidebarLink) {
            sidebarLink.classList.add('bg-white', 'bg-opacity-20');
        }
    }
    
    currentSection = sectionId;
    
    // Load section-specific data
    if (sectionId === 'analytics') {
        updateCharts();
    } else if (sectionId === 'alerts') {
        loadAlerts();
    } else if (sectionId === 'logs') {
        loadLogs();
    }
}

// Data fetching and updates
async function refreshData() {
    if (isRefreshing) {
        console.log('Already refreshing, skipping...');
        return;
    }
    
    isRefreshing = true;
    console.log('Fetching fresh data...');
    
    try {
        const response = await fetch(API_BASE + 'get_data.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
            updateDashboard(result.data);
            updateLastUpdated();
        } else {
            console.error('API Error:', result.message);
            showToast('Error fetching data: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Network error:', error);
        showToast('Network error: ' + error.message, 'error');
    } finally {
        isRefreshing = false;
    }
}

function updateDashboard(data) {
    console.log('Updating dashboard with data:', data);
    
    // Update sensor data
    if (data.sensor_data) {
        updateSensorCards(data.sensor_data);
    }
    
    // Update robot status
    if (data.robot_status) {
        updateRobotStatusDisplay(data.robot_status);
    }
    
    // Update statistics
    if (data.statistics) {
        updateStatistics(data.statistics);
    }
    
    // Update alerts count
    if (data.alerts) {
        updateAlertsCount(data.alerts);
    }
    
    // Store robot status for controls
    robotStatus = data.robot_status;
}

function updateSensorCards(sensorData) {
    console.log('Updating sensor cards:', sensorData);
    
    // AQI Card
    const aqiValue = document.getElementById('aqi-value');
    const aqiStatus = document.getElementById('aqi-status');
    const aqiIndicator = document.getElementById('aqi-indicator');
    
    if (aqiValue) aqiValue.textContent = sensorData.aqi;
    if (aqiStatus) aqiStatus.textContent = sensorData.aqi_status;
    if (aqiIndicator) aqiIndicator.style.backgroundColor = sensorData.aqi_color;
    
    // Temperature Card
    const tempValue = document.getElementById('temp-value');
    if (tempValue) tempValue.textContent = sensorData.temperature + '°C';
    
    // Humidity Card
    const humidityValue = document.getElementById('humidity-value');
    if (humidityValue) humidityValue.textContent = sensorData.humidity + '%';
    
    // Update map location
    const currentLat = document.getElementById('current-lat');
    const currentLng = document.getElementById('current-lng');
    const areaAqi = document.getElementById('area-aqi');
    
    if (currentLat) currentLat.textContent = sensorData.latitude;
    if (currentLng) currentLng.textContent = sensorData.longitude;
    if (areaAqi) areaAqi.textContent = sensorData.aqi;
}

function updateRobotStatusDisplay(robotData) {
    console.log('Updating robot status:', robotData);
    
    // Robot Status Card
    const statusText = robotData.status === 'ON' ? 'ONLINE' : 'OFFLINE';
    const statusColor = robotData.status === 'ON' ? '#10b981' : '#ef4444';
    
    const robotStatus = document.getElementById('robot-status');
    const robotIndicator = document.getElementById('robot-indicator');
    const robotMode = document.getElementById('robot-mode');
    const robotBattery = document.getElementById('robot-battery');
    const robotSpray = document.getElementById('robot-spray');
    
    if (robotStatus) {
        robotStatus.textContent = statusText;
        robotStatus.style.color = statusColor;
    }
    if (robotIndicator) robotIndicator.style.backgroundColor = statusColor;
    if (robotMode) robotMode.textContent = robotData.mode;
    if (robotBattery) robotBattery.textContent = robotData.battery_level + '%';
    if (robotSpray) robotSpray.textContent = robotData.spray_status;
    
    // Update control panel
    const robotPower = document.getElementById('robot-power');
    const sprayToggle = document.getElementById('spray-toggle');
    const aqiThreshold = document.getElementById('aqi-threshold');
    const thresholdValue = document.getElementById('threshold-value');
    
    if (robotPower) robotPower.checked = robotData.status === 'ON';
    if (sprayToggle) sprayToggle.checked = robotData.spray_status === 'ON';
    if (aqiThreshold) aqiThreshold.value = robotData.aqi_threshold;
    if (thresholdValue) thresholdValue.textContent = robotData.aqi_threshold;
    
    // Update mode buttons
    const autoModeBtn = document.getElementById('auto-mode-btn');
    const manualModeBtn = document.getElementById('manual-mode-btn');
    
    if (autoModeBtn && manualModeBtn) {
        if (robotData.mode === 'AUTO') {
            autoModeBtn.className = 'flex-1 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg transition-colors';
            manualModeBtn.className = 'flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors';
        } else {
            autoModeBtn.className = 'flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors';
            manualModeBtn.className = 'flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors';
        }
    }
    
    // Update target location
    const targetLat = document.getElementById('target-lat');
    const targetLng = document.getElementById('target-lng');
    const targetMarker = document.getElementById('target-marker');
    
    if (targetLat && targetLng && robotData.target_latitude && robotData.target_longitude) {
        targetLat.textContent = robotData.target_latitude;
        targetLng.textContent = robotData.target_longitude;
        if (targetMarker) targetMarker.classList.remove('hidden');
    }
}

function updateStatistics(stats) {
    console.log('Updating statistics:', stats);
    
    // AQI Statistics
    const aqiMin = document.getElementById('aqi-min');
    const aqiMax = document.getElementById('aqi-max');
    if (aqiMin) aqiMin.textContent = stats.min_aqi;
    if (aqiMax) aqiMax.textContent = stats.max_aqi;
    
    // Temperature Statistics
    const tempAvg = document.getElementById('temp-avg');
    const tempMin = document.getElementById('temp-min');
    const tempMax = document.getElementById('temp-max');
    if (tempAvg) tempAvg.textContent = stats.avg_temperature + '°C';
    if (tempMin) tempMin.textContent = stats.min_temperature + '°C';
    if (tempMax) tempMax.textContent = stats.max_temperature + '°C';
    
    // Humidity Statistics
    const humidityAvg = document.getElementById('humidity-avg');
    const humidityMin = document.getElementById('humidity-min');
    const humidityMax = document.getElementById('humidity-max');
    if (humidityAvg) humidityAvg.textContent = stats.avg_humidity + '%';
    if (humidityMin) humidityMin.textContent = stats.min_humidity + '%';
    if (humidityMax) humidityMax.textContent = stats.max_humidity + '%';
}

function updateAlertsCount(alerts) {
    const alertCount = alerts.length;
    const alertBadge = document.getElementById('alert-count');
    
    if (alertBadge) {
        if (alertCount > 0) {
            alertBadge.textContent = alertCount;
            alertBadge.classList.remove('hidden');
        } else {
            alertBadge.classList.add('hidden');
        }
    }
}

function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) lastUpdated.textContent = timeString;
}

// Robot control functions
async function toggleRobotPower() {
    const isOn = document.getElementById('robot-power').checked;
    const action = isOn ? 'start_robot' : 'stop_robot';
    
    console.log('Toggling robot power:', action);
    
    try {
        const response = await fetch(API_BASE + 'robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: action })
        });
        
        const result = await response.json();
        console.log('Robot control response:', result);
        
        if (result.success) {
            showToast(`Robot ${isOn ? 'started' : 'stopped'} successfully`, 'success');
            refreshData();
        } else {
            showToast('Error: ' + result.message, 'error');
            document.getElementById('robot-power').checked = !isOn;
        }
    } catch (error) {
        console.error('Robot control error:', error);
        showToast('Network error: ' + error.message, 'error');
        document.getElementById('robot-power').checked = !isOn;
    }
}

async function toggleSpray() {
    const isOn = document.getElementById('spray-toggle').checked;
    
    console.log('Toggling spray system:', isOn);
    
    try {
        const response = await fetch(API_BASE + 'robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'toggle_spray' })
        });
        
        const result = await response.json();
        console.log('Spray control response:', result);
        
        if (result.success) {
            showToast(`Spray system turned ${isOn ? 'on' : 'off'}`, 'success');
            refreshData();
        } else {
            showToast('Error: ' + result.message, 'error');
            document.getElementById('spray-toggle').checked = !isOn;
        }
    } catch (error) {
        console.error('Spray control error:', error);
        showToast('Network error: ' + error.message, 'error');
        document.getElementById('spray-toggle').checked = !isOn;
    }
}

async function setMode(mode) {
    console.log('Setting robot mode:', mode);
    
    try {
        const response = await fetch(API_BASE + 'robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'set_mode', mode: mode })
        });
        
        const result = await response.json();
        console.log('Mode control response:', result);
        
        if (result.success) {
            showToast(`Mode changed to ${mode}`, 'success');
            refreshData();
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Mode control error:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

async function updateThreshold(value) {
    document.getElementById('threshold-value').textContent = value;
    
    console.log('Updating AQI threshold:', value);
    
    try {
        const response = await fetch(API_BASE + 'robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'set_threshold', threshold: parseInt(value) })
        });
        
        const result = await response.json();
        console.log('Threshold update response:', result);
        
        if (result.success) {
            showToast(`AQI threshold set to ${value}`, 'success');
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Threshold update error:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

async function manualControl(direction) {
    const statusElement = document.getElementById('manual-status');
    if (statusElement) {
        statusElement.textContent = `Moving ${direction}...`;
        statusElement.className = 'inline-block px-3 py-1 bg-yellow-500 rounded-full text-sm';
    }
    
    console.log('Manual robot control:', direction);
    
    try {
        const response = await fetch(API_BASE + 'robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'manual_control', direction: direction })
        });
        
        const result = await response.json();
        console.log('Manual control response:', result);
        
        if (result.success) {
            if (statusElement) {
                statusElement.textContent = 'Moved ' + direction;
                statusElement.className = 'inline-block px-3 py-1 bg-green-500 rounded-full text-sm';
            }
            refreshData();
            
            // Reset status after 2 seconds
            setTimeout(() => {
                if (statusElement) {
                    statusElement.textContent = 'Ready';
                    statusElement.className = 'inline-block px-3 py-1 bg-gray-600 rounded-full text-sm';
                }
            }, 2000);
        } else {
            if (statusElement) {
                statusElement.textContent = 'Error';
                statusElement.className = 'inline-block px-3 py-1 bg-red-500 rounded-full text-sm';
            }
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Manual control error:', error);
        if (statusElement) {
            statusElement.textContent = 'Error';
            statusElement.className = 'inline-block px-3 py-1 bg-red-500 rounded-full text-sm';
        }
        showToast('Network error: ' + error.message, 'error');
    }
}

async function goToHighAQIArea() {
    // Simulate finding high AQI area
    const highAQILocation = { lat: 28.6170, lng: 77.2120 }; // High AQI location from sample data
    
    console.log('Moving to high AQI area:', highAQILocation);
    
    try {
        const response = await fetch(API_BASE + 'robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                action: 'move_robot', 
                latitude: highAQILocation.lat, 
                longitude: highAQILocation.lng 
            })
        });
        
        const result = await response.json();
        console.log('Move robot response:', result);
        
        if (result.success) {
            showToast('Robot moving to high AQI area', 'success');
            refreshData();
            
            // Animate robot movement on map
            animateRobotMovement(highAQILocation.lat, highAQILocation.lng);
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Move robot error:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

async function returnToBase() {
    const baseLocation = { lat: 28.6139, lng: 77.2090 }; // Base location
    
    console.log('Returning to base:', baseLocation);
    
    try {
        const response = await fetch(API_BASE + 'robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                action: 'move_robot', 
                latitude: baseLocation.lat, 
                longitude: baseLocation.lng 
            })
        });
        
        const result = await response.json();
        console.log('Return to base response:', result);
        
        if (result.success) {
            showToast('Robot returning to base', 'success');
            refreshData();
            
            // Animate robot movement on map
            animateRobotMovement(baseLocation.lat, baseLocation.lng);
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Return to base error:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

function animateRobotMovement(lat, lng) {
    const marker = document.getElementById('robot-marker');
    if (marker) {
        // Convert lat/lng to map percentage (simplified)
        const topPercent = 50 - ((lat - 28.6) * 100); // Rough conversion
        const leftPercent = 50 + ((lng - 77.2) * 100); // Rough conversion
        
        marker.style.transition = 'all 2s ease-in-out';
        marker.style.top = topPercent + '%';
        marker.style.left = leftPercent + '%';
    }
}

// Charts initialization and updates
function initializeCharts() {
    console.log('Initializing charts...');
    
    // AQI Chart
    const aqiCtx = document.getElementById('aqi-chart');
    if (aqiCtx) {
        aqiChart = new Chart(aqiCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'AQI',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Temperature & Humidity Chart
    const tempHumidityCtx = document.getElementById('temp-humidity-chart');
    if (tempHumidityCtx) {
        tempHumidityChart = new Chart(tempHumidityCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1,
                    yAxisID: 'y'
                }, {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                }
            }
        });
    }
}

async function updateCharts() {
    const period = document.getElementById('period-select')?.value || '24h';
    
    console.log('Updating charts for period:', period);
    
    try {
        const response = await fetch(`${API_BASE}get_history.php?period=${period}`);
        const result = await response.json();
        
        if (result.success) {
            const chartData = result.data.chart_data;
            
            // Format labels based on period
            let labels = chartData.labels;
            if (period === '24h') {
                labels = labels.map(label => new Date(label).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }));
            } else if (period === '7d' || period === '30d') {
                labels = labels.map(label => new Date(label).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                }));
            }
            
            // Update AQI Chart
            if (aqiChart) {
                aqiChart.data.labels = labels;
                aqiChart.data.datasets[0].data = chartData.aqi_data;
                
                // Update color based on AQI values
                const maxAQI = Math.max(...chartData.aqi_data);
                const avgAQI = chartData.aqi_data.reduce((a, b) => a + b, 0) / chartData.aqi_data.length;
                
                if (avgAQI > 150) {
                    aqiChart.data.datasets[0].borderColor = 'rgb(255, 99, 132)';
                    aqiChart.data.datasets[0].backgroundColor = 'rgba(255, 99, 132, 0.2)';
                } else if (avgAQI > 100) {
                    aqiChart.data.datasets[0].borderColor = 'rgb(255, 159, 64)';
                    aqiChart.data.datasets[0].backgroundColor = 'rgba(255, 159, 64, 0.2)';
                } else if (avgAQI > 50) {
                    aqiChart.data.datasets[0].borderColor = 'rgb(255, 205, 86)';
                    aqiChart.data.datasets[0].backgroundColor = 'rgba(255, 205, 86, 0.2)';
                } else {
                    aqiChart.data.datasets[0].borderColor = 'rgb(75, 192, 192)';
                    aqiChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.2)';
                }
                
                aqiChart.update();
            }
            
            // Update Temperature & Humidity Chart
            if (tempHumidityChart) {
                tempHumidityChart.data.labels = labels;
                tempHumidityChart.data.datasets[0].data = chartData.temperature_data;
                tempHumidityChart.data.datasets[1].data = chartData.humidity_data;
                tempHumidityChart.update();
            }
            
            // Update AQI Distribution
            updateAQIDistribution(result.data.aqi_distribution);
        } else {
            console.error('Error fetching chart data:', result.message);
            showToast('Error fetching chart data: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Chart update error:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

function updateAQIDistribution(distribution) {
    const elements = {
        'dist-good': distribution['Good (0-50)'] || 0,
        'dist-moderate': distribution['Moderate (51-100)'] || 0,
        'dist-sensitive': distribution['Unhealthy for Sensitive (101-150)'] || 0,
        'dist-unhealthy': distribution['Unhealthy (151-200)'] || 0,
        'dist-very-unhealthy': distribution['Very Unhealthy (201-300)'] || 0,
        'dist-hazardous': distribution['Hazardous (301+)'] || 0
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = elements[id];
    });
}

// Alerts and logs
async function loadAlerts() {
    console.log('Loading alerts...');
    
    try {
        const response = await fetch(API_BASE + 'get_data.php');
        const result = await response.json();
        
        if (result.success) {
            displayAlerts(result.data.alerts);
        } else {
            console.error('Error fetching alerts:', result.message);
            showToast('Error fetching alerts: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Alerts load error:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

function displayAlerts(alerts) {
    const alertsList = document.getElementById('alerts-list');
    if (!alertsList) return;
    
    if (alerts.length === 0) {
        alertsList.innerHTML = '<p class="text-gray-400 text-center py-8">No alerts at this time</p>';
        return;
    }
    
    alertsList.innerHTML = alerts.map(alert => {
        const levelColor = {
            'INFO': 'bg-blue-500',
            'WARNING': 'bg-yellow-500',
            'ERROR': 'bg-red-500',
            'CRITICAL': 'bg-red-700'
        }[alert.level] || 'bg-gray-500';
        
        const createdTime = new Date(alert.created_at).toLocaleString();
        
        return `
            <div class="glassmorphism rounded-lg p-4 flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 rounded-full ${levelColor}"></div>
                    <div>
                        <p class="font-medium">${alert.message}</p>
                        <p class="text-sm text-gray-400">${createdTime}</p>
                    </div>
                </div>
                <button onclick="dismissAlert(${alert.id})" class="text-gray-400 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

async function dismissAlert(alertId) {
    console.log('Dismissing alert:', alertId);
    
    // This would typically call an API to mark the alert as read
    // For now, we'll just reload the alerts
    loadAlerts();
}

async function loadLogs() {
    console.log('Loading system logs...');
    
    try {
        const response = await fetch(`${API_BASE}get_history.php?period=24h`);
        const result = await response.json();
        
        if (result.success) {
            displayLogs(result.data.system_logs);
        } else {
            console.error('Error fetching logs:', result.message);
            showToast('Error fetching logs: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Logs load error:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

function displayLogs(logs) {
    const logsTable = document.getElementById('logs-table');
    if (!logsTable) return;
    
    if (logs.length === 0) {
        logsTable.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">No logs available</td></tr>';
        return;
    }
    
    logsTable.innerHTML = logs.map(log => {
        const createdTime = new Date(log.created_at).toLocaleString();
        return `
            <tr class="border-b border-gray-800">
                <td class="py-3 px-4">${createdTime}</td>
                <td class="py-3 px-4">${log.action}</td>
                <td class="py-3 px-4">${log.details || '-'}</td>
                <td class="py-3 px-4">${log.user_id}</td>
            </tr>
        `;
    }).join('');
}

// Utility functions
function showToast(message, type = 'info') {
    console.log('Showing toast:', message, type);
    
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    
    const bgColor = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'warning': 'bg-yellow-500',
        'info': 'bg-blue-500'
    }[type] || 'bg-gray-500';
    
    const icon = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    }[type] || 'info-circle';
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `notification-toast ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3`;
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const element = document.getElementById(toastId);
        if (element) {
            element.remove();
        }
    }, 5000);
}

function startAutoRefresh() {
    console.log('Starting auto refresh (5 seconds)...');
    
    // Refresh data every 5 seconds
    autoRefreshInterval = setInterval(() => {
        refreshData();
    }, 5000);
}

function stopAutoRefresh() {
    console.log('Stopping auto refresh...');
    
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log('Page unloading, cleaning up...');
    stopAutoRefresh();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Press 'R' to refresh
    if (e.key === 'r' || e.key === 'R') {
        if (!e.target.matches('input, textarea')) {
            e.preventDefault();
            refreshData();
        }
    }
});

// Add visibility change handler to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden, pausing auto refresh');
        stopAutoRefresh();
    } else {
        console.log('Page visible, resuming auto refresh');
        startAutoRefresh();
        refreshData(); // Refresh when page becomes visible again
    }
});

console.log('Admin dashboard script loaded successfully');
