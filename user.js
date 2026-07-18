// Global variables
let trendChart = null;
let autoRefreshInterval = null;
let currentPeriod = '24h';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    startAutoRefresh();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

function initializeDashboard() {
    refreshData();
    initializeChart();
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', dateOptions);
    
    // Update time
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', timeOptions);
}

// Data fetching and updates
async function refreshData() {
    const refreshBtn = document.querySelector('.refresh-btn');
    refreshBtn.classList.add('spinning');
    
    try {
        const response = await fetch('../api/get_data.php');
        const result = await response.json();
        
        if (result.success) {
            updateDashboard(result.data);
            updateLastUpdated();
        } else {
            showNotification('Error fetching data: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            refreshBtn.classList.remove('spinning');
        }, 1000);
    }
}

function updateDashboard(data) {
    // Update AQI display
    updateAQIDisplay(data.sensor_data);
    
    // Update metrics
    updateMetrics(data.sensor_data, data.robot_status);
    
    // Update statistics
    updateStatistics(data.statistics);
    
    // Update health recommendations
    updateHealthRecommendations(data.sensor_data);
    
    // Update chart
    updateChart();
}

function updateAQIDisplay(sensorData) {
    const aqi = sensorData.aqi;
    const aqiCircle = document.getElementById('aqi-circle');
    const aqiValue = document.getElementById('aqi-value');
    const aqiStatus = document.getElementById('aqi-status');
    
    // Update values
    aqiValue.textContent = Math.round(aqi);
    aqiStatus.textContent = sensorData.aqi_status;
    
    // Update color based on AQI
    aqiCircle.className = 'aqi-circle ' + getAQIClass(aqi);
    
    // Add pulse animation for high AQI
    if (aqi > 150) {
        aqiCircle.style.animation = 'pulse 2s infinite';
    } else {
        aqiCircle.style.animation = 'none';
    }
}

function getAQIClass(aqi) {
    if (aqi <= 50) return 'aqi-good';
    if (aqi <= 100) return 'aqi-moderate';
    if (aqi <= 150) return 'aqi-unhealthy-sensitive';
    if (aqi <= 200) return 'aqi-unhealthy';
    if (aqi <= 300) return 'aqi-very-unhealthy';
    return 'aqi-hazardous';
}

function updateMetrics(sensorData, robotStatus) {
    // Update temperature
    document.getElementById('temperature').textContent = sensorData.temperature + '°C';
    document.getElementById('feels-like').textContent = (sensorData.temperature + 2) + '°C'; // Simulated feels-like
    
    // Update humidity
    document.getElementById('humidity').textContent = sensorData.humidity + '%';
    const humidityStatus = getHumidityStatus(sensorData.humidity);
    document.getElementById('humidity-status').textContent = humidityStatus;
    
    // Update robot status
    const isOnline = robotStatus.status === 'ON';
    document.getElementById('robot-status').textContent = isOnline ? 'Online' : 'Offline';
    document.getElementById('system-status').textContent = isOnline ? 'System active' : 'System inactive';
    
    const statusIndicator = document.getElementById('status-indicator');
    statusIndicator.className = 'w-2 h-2 rounded-full mr-2 ' + (isOnline ? 'bg-green-500' : 'bg-gray-400');
    
    // Update location (simulate based on coordinates)
    const location = getLocationFromCoords(sensorData.latitude, sensorData.longitude);
    document.getElementById('location').textContent = location;
}

function getHumidityStatus(humidity) {
    if (humidity < 30) return 'Low humidity - Consider using a humidifier';
    if (humidity < 60) return 'Comfortable humidity level';
    if (humidity < 80) return 'Moderate humidity';
    return 'High humidity - Consider using a dehumidifier';
}

function getLocationFromCoords(lat, lng) {
    // Simplified location lookup based on coordinates
    if (Math.abs(lat - 28.6139) < 0.01 && Math.abs(lng - 77.2090) < 0.01) {
        return 'New Delhi, India';
    } else if (Math.abs(lat - 28.6170) < 0.01 && Math.abs(lng - 77.2120) < 0.01) {
        return 'Sector 18, New Delhi';
    } else {
        return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
}

function updateStatistics(stats) {
    document.getElementById('avg-aqi').textContent = stats.avg_aqi;
    document.getElementById('max-aqi').textContent = stats.max_aqi;
    document.getElementById('min-aqi').textContent = stats.min_aqi;
    document.getElementById('readings-count').textContent = stats.readings_count;
}

function updateHealthRecommendations(sensorData) {
    const aqi = sensorData.aqi;
    const generalAdvice = document.getElementById('general-advice');
    const outdoorAdvice = document.getElementById('outdoor-advice');
    const sensitiveAdvice = document.getElementById('sensitive-advice');
    
    if (aqi <= 50) {
        generalAdvice.textContent = 'Air quality is excellent. Enjoy your day!';
        outdoorAdvice.textContent = 'Perfect for outdoor activities like running, cycling, and sports.';
        sensitiveAdvice.textContent = 'No precautions needed for sensitive groups.';
    } else if (aqi <= 100) {
        generalAdvice.textContent = 'Air quality is acceptable for most people.';
        outdoorAdvice.textContent = 'Outdoor activities are generally safe for most people.';
        sensitiveAdvice.textContent = 'Sensitive individuals should consider limiting prolonged outdoor exertion.';
    } else if (aqi <= 150) {
        generalAdvice.textContent = 'Air quality is moderate. Be cautious with outdoor activities.';
        outdoorAdvice.textContent = 'Limit prolonged outdoor exertion, especially for sensitive groups.';
        sensitiveAdvice.textContent = 'Children, elderly, and people with respiratory conditions should stay indoors.';
    } else if (aqi <= 200) {
        generalAdvice.textContent = 'Air quality is unhealthy. Take precautions.';
        outdoorAdvice.textContent = 'Avoid prolonged outdoor activities. Consider indoor alternatives.';
        sensitiveAdvice.textContent = 'Sensitive groups should remain indoors and avoid physical exertion.';
    } else if (aqi <= 300) {
        generalAdvice.textContent = 'Air quality is very unhealthy. Avoid outdoor activities.';
        outdoorAdvice.textContent = 'All outdoor activities should be avoided. Stay indoors.';
        sensitiveAdvice.textContent = 'Everyone should remain indoors and avoid all physical exertion.';
    } else {
        generalAdvice.textContent = 'Air quality is hazardous. Emergency conditions.';
        outdoorAdvice.textContent = 'Emergency! Stay indoors and avoid all outdoor activities.';
        sensitiveAdvice.textContent = 'Everyone should remain indoors. Consider evacuation if advised.';
    }
}

function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-updated').textContent = timeString;
}

// Chart functionality
function initializeChart() {
    const ctx = document.getElementById('trend-chart').getContext('2d');
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'AQI',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

async function updateChart() {
    try {
        const response = await fetch(`../api/get_history.php?period=${currentPeriod}`);
        const result = await response.json();
        
        if (result.success) {
            const chartData = result.data.chart_data;
            
            // Format labels based on period
            let labels = chartData.labels;
            if (currentPeriod === '24h') {
                labels = labels.map(label => new Date(label).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }));
            } else if (currentPeriod === '7d' || currentPeriod === '30d') {
                labels = labels.map(label => new Date(label).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                }));
            }
            
            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = chartData.aqi_data;
            
            // Update color based on AQI values
            const maxAQI = Math.max(...chartData.aqi_data);
            const avgAQI = chartData.aqi_data.reduce((a, b) => a + b, 0) / chartData.aqi_data.length;
            
            if (avgAQI > 150) {
                trendChart.data.datasets[0].borderColor = 'rgb(255, 99, 132)';
                trendChart.data.datasets[0].backgroundColor = 'rgba(255, 99, 132, 0.2)';
            } else if (avgAQI > 100) {
                trendChart.data.datasets[0].borderColor = 'rgb(255, 159, 64)';
                trendChart.data.datasets[0].backgroundColor = 'rgba(255, 159, 64, 0.2)';
            } else if (avgAQI > 50) {
                trendChart.data.datasets[0].borderColor = 'rgb(255, 205, 86)';
                trendChart.data.datasets[0].backgroundColor = 'rgba(255, 205, 86, 0.2)';
            } else {
                trendChart.data.datasets[0].borderColor = 'rgb(75, 192, 192)';
                trendChart.data.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.2)';
            }
            
            trendChart.update();
        } else {
            showNotification('Error fetching chart data: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('Network error: ' + error.message, 'error');
    }
}

function changeChartPeriod(period) {
    currentPeriod = period;
    
    // Update button styles
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.className = 'chart-period-btn px-3 py-1 bg-gray-200 rounded-lg text-sm';
    });
    event.target.className = 'chart-period-btn px-3 py-1 bg-blue-500 text-white rounded-lg text-sm';
    
    // Update chart
    updateChart();
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 fade-in ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas fa-${
                type === 'error' ? 'exclamation-circle' : 
                type === 'success' ? 'check-circle' : 
                type === 'warning' ? 'exclamation-triangle' : 'info-circle'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function startAutoRefresh() {
    // Refresh data every 30 seconds for user dashboard (less frequent than admin)
    autoRefreshInterval = setInterval(() => {
        refreshData();
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
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
    
    // Press '1', '2', '3', '4' to change chart period
    if (e.key === '1') changeChartPeriod('1h');
    if (e.key === '2') changeChartPeriod('6h');
    if (e.key === '3') changeChartPeriod('24h');
    if (e.key === '4') changeChartPeriod('7d');
});

// Add visibility change handler to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
        refreshData(); // Refresh when page becomes visible again
    }
});
