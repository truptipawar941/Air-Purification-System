// Global variables
let currentSection = 'overview';
let aqiChart = null;
let tempHumidityChart = null;
let autoRefreshInterval = null;
let robotStatus = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    startAutoRefresh();
});

function initializeDashboard() {
    showSection('overview');
    refreshData();
    initializeCharts();
}

// Section management
function showSection(sectionId, eventElement = null) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
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
    try {
        const response = await fetch('../api/get_data.php');
        const result = await response.json();
        
        if (result.success) {
            updateDashboard(result.data);
            updateLastUpdated();
        } else {
            showToast('Error fetching data: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

function updateDashboard(data) {
    // Update sensor data
    updateSensorCards(data.sensor_data);
    
    // Update robot status
    updateRobotStatusDisplay(data.robot_status);
    
    // Update statistics
    updateStatistics(data.statistics);
    
    // Update alerts count
    updateAlertsCount(data.alerts);
    
    // Store robot status for controls
    robotStatus = data.robot_status;
}

function updateSensorCards(sensorData) {
    // AQI Card
    document.getElementById('aqi-value').textContent = sensorData.aqi;
    document.getElementById('aqi-status').textContent = sensorData.aqi_status;
    document.getElementById('aqi-indicator').style.backgroundColor = sensorData.aqi_color;
    
    // Temperature Card
    document.getElementById('temp-value').textContent = sensorData.temperature + '°C';
    
    // Humidity Card
    document.getElementById('humidity-value').textContent = sensorData.humidity + '%';
    
    // Update map location
    document.getElementById('current-lat').textContent = sensorData.latitude;
    document.getElementById('current-lng').textContent = sensorData.longitude;
    document.getElementById('area-aqi').textContent = sensorData.aqi;
}

function updateRobotStatusDisplay(robotData) {
    // Robot Status Card
    const statusText = robotData.status === 'ON' ? 'ONLINE' : 'OFFLINE';
    const statusColor = robotData.status === 'ON' ? '#10b981' : '#ef4444';
    
    document.getElementById('robot-status').textContent = statusText;
    document.getElementById('robot-status').style.color = statusColor;
    document.getElementById('robot-indicator').style.backgroundColor = statusColor;
    document.getElementById('robot-mode').textContent = robotData.mode;
    document.getElementById('robot-battery').textContent = robotData.battery_level + '%';
    document.getElementById('robot-spray').textContent = robotData.spray_status;
    
    // Update control panel
    document.getElementById('robot-power').checked = robotData.status === 'ON';
    document.getElementById('spray-toggle').checked = robotData.spray_status === 'ON';
    document.getElementById('aqi-threshold').value = robotData.aqi_threshold;
    document.getElementById('threshold-value').textContent = robotData.aqi_threshold;
    
    // Update mode buttons
    if (robotData.mode === 'AUTO') {
        document.getElementById('auto-mode-btn').className = 'flex-1 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg transition-colors';
        document.getElementById('manual-mode-btn').className = 'flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors';
    } else {
        document.getElementById('auto-mode-btn').className = 'flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors';
        document.getElementById('manual-mode-btn').className = 'flex-1 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors';
    }
    
    // Update target location
    if (robotData.target_latitude && robotData.target_longitude) {
        document.getElementById('target-lat').textContent = robotData.target_latitude;
        document.getElementById('target-lng').textContent = robotData.target_longitude;
        document.getElementById('target-marker').classList.remove('hidden');
    }
}

function updateStatistics(stats) {
    // AQI Statistics
    document.getElementById('aqi-min').textContent = stats.min_aqi;
    document.getElementById('aqi-max').textContent = stats.max_aqi;
    
    // Temperature Statistics
    document.getElementById('temp-avg').textContent = stats.avg_temperature + '°C';
    document.getElementById('temp-min').textContent = stats.min_temperature + '°C';
    document.getElementById('temp-max').textContent = stats.max_temperature + '°C';
    
    // Humidity Statistics
    document.getElementById('humidity-avg').textContent = stats.avg_humidity + '%';
    document.getElementById('humidity-min').textContent = stats.min_humidity + '%';
    document.getElementById('humidity-max').textContent = stats.max_humidity + '%';
}

function updateAlertsCount(alerts) {
    const alertCount = alerts.length;
    const alertBadge = document.getElementById('alert-count');
    
    if (alertCount > 0) {
        alertBadge.textContent = alertCount;
        alertBadge.classList.remove('hidden');
    } else {
        alertBadge.classList.add('hidden');
    }
}

function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-updated').textContent = timeString;
}

// Robot control functions
async function toggleRobotPower() {
    const isOn = document.getElementById('robot-power').checked;
    const action = isOn ? 'start_robot' : 'stop_robot';
    
    try {
        const response = await fetch('../api/robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: action })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Robot ${isOn ? 'started' : 'stopped'} successfully`, 'success');
            refreshData();
        } else {
            showToast('Error: ' + result.message, 'error');
            document.getElementById('robot-power').checked = !isOn;
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
        document.getElementById('robot-power').checked = !isOn;
    }
}

async function toggleSpray() {
    const isOn = document.getElementById('spray-toggle').checked;
    
    try {
        const response = await fetch('../api/robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'toggle_spray' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Spray system turned ${isOn ? 'on' : 'off'}`, 'success');
            refreshData();
        } else {
            showToast('Error: ' + result.message, 'error');
            document.getElementById('spray-toggle').checked = !isOn;
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
        document.getElementById('spray-toggle').checked = !isOn;
    }
}

async function setMode(mode) {
    try {
        const response = await fetch('../api/robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'set_mode', mode: mode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Mode changed to ${mode}`, 'success');
            refreshData();
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

async function updateThreshold(value) {
    document.getElementById('threshold-value').textContent = value;
    
    try {
        const response = await fetch('../api/robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'set_threshold', threshold: parseInt(value) })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`AQI threshold set to ${value}`, 'success');
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

async function manualControl(direction) {
    const statusElement = document.getElementById('manual-status');
    statusElement.textContent = `Moving ${direction}...`;
    statusElement.className = 'inline-block px-3 py-1 bg-yellow-500 rounded-full text-sm';
    
    try {
        const response = await fetch('../api/robot_control.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'manual_control', direction: direction })
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusElement.textContent = 'Moved ' + direction;
            statusElement.className = 'inline-block px-3 py-1 bg-green-500 rounded-full text-sm';
            refreshData();
            
            // Reset status after 2 seconds
            setTimeout(() => {
                statusElement.textContent = 'Ready';
                statusElement.className = 'inline-block px-3 py-1 bg-gray-600 rounded-full text-sm';
            }, 2000);
        } else {
            statusElement.textContent = 'Error';
            statusElement.className = 'inline-block px-3 py-1 bg-red-500 rounded-full text-sm';
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        statusElement.textContent = 'Error';
        statusElement.className = 'inline-block px-3 py-1 bg-red-500 rounded-full text-sm';
        showToast('Network error: ' + error.message, 'error');
    }
}

async function goToHighAQIArea() {
    // Simulate finding high AQI area
    const highAQILocation = { lat: 28.6170, lng: 77.2120 }; // High AQI location from sample data
    
    try {
        const response = await fetch('../api/robot_control.php', {
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
        
        if (result.success) {
            showToast('Robot moving to high AQI area', 'success');
            refreshData();
            
            // Animate robot movement on map
            animateRobotMovement(highAQILocation.lat, highAQILocation.lng);
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

async function returnToBase() {
    const baseLocation = { lat: 28.6139, lng: 77.2090 }; // Base location
    
    try {
        const response = await fetch('../api/robot_control.php', {
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
        
        if (result.success) {
            showToast('Robot returning to base', 'success');
            refreshData();
            
            // Animate robot movement on map
            animateRobotMovement(baseLocation.lat, baseLocation.lng);
        } else {
            showToast('Error: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

function animateRobotMovement(lat, lng) {
    const marker = document.getElementById('robot-marker');
    
    // Convert lat/lng to map percentage (simplified)
    const topPercent = 50 - ((lat - 28.6) * 100); // Rough conversion
    const leftPercent = 50 + ((lng - 77.2) * 100); // Rough conversion
    
    marker.style.transition = 'all 2s ease-in-out';
    marker.style.top = topPercent + '%';
    marker.style.left = leftPercent + '%';
}

// Charts initialization and updates
function initializeCharts() {
    // AQI Chart
    const aqiCtx = document.getElementById('aqi-chart').getContext('2d');
    aqiChart = new Chart(aqiCtx, {
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
    
    // Temperature & Humidity Chart
    const tempHumidityCtx = document.getElementById('temp-humidity-chart').getContext('2d');
    tempHumidityChart = new Chart(tempHumidityCtx, {
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

async function updateCharts() {
    const period = document.getElementById('period-select').value;
    
    try {
        const response = await fetch(`../api/get_history.php?period=${period}`);
        const result = await response.json();
        
        if (result.success) {
            const chartData = result.data.chart_data;
            
            // Update AQI Chart
            aqiChart.data.labels = chartData.labels;
            aqiChart.data.datasets[0].data = chartData.aqi_data;
            aqiChart.update();
            
            // Update Temperature & Humidity Chart
            tempHumidityChart.data.labels = chartData.labels;
            tempHumidityChart.data.datasets[0].data = chartData.temperature_data;
            tempHumidityChart.data.datasets[1].data = chartData.humidity_data;
            tempHumidityChart.update();
            
            // Update AQI Distribution
            updateAQIDistribution(result.data.aqi_distribution);
        } else {
            showToast('Error fetching chart data: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

function updateAQIDistribution(distribution) {
    document.getElementById('dist-good').textContent = distribution['Good (0-50)'];
    document.getElementById('dist-moderate').textContent = distribution['Moderate (51-100)'];
    document.getElementById('dist-sensitive').textContent = distribution['Unhealthy for Sensitive (101-150)'];
    document.getElementById('dist-unhealthy').textContent = distribution['Unhealthy (151-200)'];
    document.getElementById('dist-very-unhealthy').textContent = distribution['Very Unhealthy (201-300)'];
    document.getElementById('dist-hazardous').textContent = distribution['Hazardous (301+)'];
}

// Alerts and logs
async function loadAlerts() {
    try {
        const response = await fetch('../api/get_data.php');
        const result = await response.json();
        
        if (result.success) {
            displayAlerts(result.data.alerts);
        } else {
            showToast('Error fetching alerts: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

function displayAlerts(alerts) {
    const alertsList = document.getElementById('alerts-list');
    
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
        
        return `
            <div class="glassmorphism rounded-lg p-4 flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 rounded-full ${levelColor}"></div>
                    <div>
                        <p class="font-medium">${alert.message}</p>
                        <p class="text-sm text-gray-400">${new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                </div>
                <button onclick="dismissAlert(${alert.id})" class="text-gray-400 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

async function loadLogs() {
    try {
        const response = await fetch('../api/get_history.php?period=24h');
        const result = await response.json();
        
        if (result.success) {
            displayLogs(result.data.system_logs);
        } else {
            showToast('Error fetching logs: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

function displayLogs(logs) {
    const logsTable = document.getElementById('logs-table');
    
    if (logs.length === 0) {
        logsTable.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">No logs available</td></tr>';
        return;
    }
    
    logsTable.innerHTML = logs.map(log => `
        <tr class="border-b border-gray-800">
            <td class="py-3 px-4">${new Date(log.created_at).toLocaleString()}</td>
            <td class="py-3 px-4">${log.action}</td>
            <td class="py-3 px-4">${log.details || '-'}</td>
            <td class="py-3 px-4">${log.user_id}</td>
        </tr>
    `).join('');
}

// Utility functions
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toastId = 'toast-' + Date.now();
    
    const bgColor = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'warning': 'bg-yellow-500',
        'info': 'bg-blue-500'
    }[type] || 'bg-gray-500';
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `notification-toast ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
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
    // Refresh data every 5 seconds
    autoRefreshInterval = setInterval(() => {
        refreshData();
    }, 5000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
