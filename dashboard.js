// Dashboard JavaScript - Live Sensor Data Monitoring
let tempGauge, humidityGauge, mqGauge, aqiGauge;
let liveChart;
let historicalData = {
    temperature: [],
    humidity: [],
    mq: [],
    aqi: [],
    timestamps: []
};
let maxDataPoints = 20;
let currentChartType = 'aqi';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeGauges();
    initializeChart();
    startDataFetching();
    setupEventListeners();
});

// Initialize gauge meters
function initializeGauges() {
    // Temperature Gauge (0-50°C)
    tempGauge = new Gauge(document.getElementById('temp-gauge')).setOptions({
        angle: -0.2,
        lineWidth: 0.2,
        radiusScale: 1,
        pointer: {
            length: 0.6,
            strokeWidth: 0.035,
            color: '#ffffff'
        },
        limitMax: false,
        limitMin: false,
        colorStart: '#10b981',
        colorStop: '#ef4444',
        strokeColor: '#ffffff',
        generateGradient: true,
        highDpiSupport: true,
        staticZones: [
            {strokeStyle: "#10b981", min: 0, max: 30},
            {strokeStyle: "#f59e0b", min: 30, max: 40},
            {strokeStyle: "#ef4444", min: 40, max: 50}
        ],
        staticLabels: {
            font: "12px Inter",
            labels: [0, 10, 20, 30, 40, 50],
            color: "#ffffff",
            fractionDigits: 0
        },
        renderTicks: {
            divisions: 5,
            divWidth: 1.1,
            divLength: 0.7,
            divColor: '#ffffff',
            subDivisions: 3,
            subLength: 0.5,
            subWidth: 0.6,
            subColor: '#ffffff'
        }
    });
    tempGauge.maxValue = 50;
    tempGauge.setMinValue(0);
    tempGauge.animationSpeed = 32;

    // Humidity Gauge (0-100%)
    humidityGauge = new Gauge(document.getElementById('humidity-gauge')).setOptions({
        angle: -0.2,
        lineWidth: 0.2,
        radiusScale: 1,
        pointer: {
            length: 0.6,
            strokeWidth: 0.035,
            color: '#ffffff'
        },
        limitMax: false,
        limitMin: false,
        colorStart: '#3b82f6',
        colorStop: '#06b6d4',
        strokeColor: '#ffffff',
        generateGradient: true,
        staticZones: [
            {strokeStyle: "#06b6d4", min: 0, max: 30},
            {strokeStyle: "#3b82f6", min: 30, max: 60},
            {strokeStyle: "#1e40af", min: 60, max: 100}
        ],
        staticLabels: {
            font: "12px Inter",
            labels: [0, 20, 40, 60, 80, 100],
            color: "#ffffff",
            fractionDigits: 0
        },
        renderTicks: {
            divisions: 5,
            divWidth: 1.1,
            divLength: 0.7,
            divColor: '#ffffff',
            subDivisions: 2,
            subLength: 0.5,
            subWidth: 0.6,
            subColor: '#ffffff'
        }
    });
    humidityGauge.maxValue = 100;
    humidityGauge.setMinValue(0);
    humidityGauge.animationSpeed = 32;

    // MQ Gas Gauge (0-500)
    mqGauge = new Gauge(document.getElementById('mq-gauge')).setOptions({
        angle: -0.2,
        lineWidth: 0.2,
        radiusScale: 1,
        pointer: {
            length: 0.6,
            strokeWidth: 0.035,
            color: '#ffffff'
        },
        limitMax: false,
        limitMin: false,
        colorStart: '#10b981',
        colorStop: '#ef4444',
        strokeColor: '#ffffff',
        generateGradient: true,
        staticZones: [
            {strokeStyle: "#10b981", min: 0, max: 100},
            {strokeStyle: "#f59e0b", min: 100, max: 300},
            {strokeStyle: "#ef4444", min: 300, max: 500}
        ],
        staticLabels: {
            font: "12px Inter",
            labels: [0, 100, 200, 300, 400, 500],
            color: "#ffffff",
            fractionDigits: 0
        },
        renderTicks: {
            divisions: 5,
            divWidth: 1.1,
            divLength: 0.7,
            divColor: '#ffffff',
            subDivisions: 2,
            subLength: 0.5,
            subWidth: 0.6,
            subColor: '#ffffff'
        }
    });
    mqGauge.maxValue = 500;
    mqGauge.setMinValue(0);
    mqGauge.animationSpeed = 32;

    // AQI Gauge (0-500)
    aqiGauge = new Gauge(document.getElementById('aqi-gauge')).setOptions({
        angle: -0.2,
        lineWidth: 0.2,
        radiusScale: 1,
        pointer: {
            length: 0.6,
            strokeWidth: 0.035,
            color: '#ffffff'
        },
        limitMax: false,
        limitMin: false,
        colorStart: '#10b981',
        colorStop: '#ef4444',
        strokeColor: '#ffffff',
        generateGradient: true,
        staticZones: [
            {strokeStyle: "#10b981", min: 0, max: 50},
            {strokeStyle: "#f59e0b", min: 50, max: 100},
            {strokeStyle: "#f97316", min: 100, max: 200},
            {strokeStyle: "#ef4444", min: 200, max: 500}
        ],
        staticLabels: {
            font: "12px Inter",
            labels: [0, 50, 100, 200, 300, 400, 500],
            color: "#ffffff",
            fractionDigits: 0
        },
        renderTicks: {
            divisions: 7,
            divWidth: 1.1,
            divLength: 0.7,
            divColor: '#ffffff',
            subDivisions: 2,
            subLength: 0.5,
            subWidth: 0.6,
            subColor: '#ffffff'
        }
    });
    aqiGauge.maxValue = 500;
    aqiGauge.setMinValue(0);
    aqiGauge.animationSpeed = 32;
}

// Initialize live chart
function initializeChart() {
    const ctx = document.getElementById('live-chart').getContext('2d');
    liveChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'AQI',
                data: [],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#8b5cf6',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.2)'
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.2)'
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: 'Inter'
                        }
                    },
                    beginAtZero: true
                }
            },
            animation: {
                duration: 750
            }
        }
    });
}

// Fetch data from API
async function fetchData() {
    try {
        const response = await fetch('../api/data.php');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        updateDashboard(data);
        updateLastUpdated();
    } catch (error) {
        console.error('Error fetching data:', error);
        showErrorMessage('Failed to fetch sensor data');
    }
}

// Update dashboard with new data
function updateDashboard(data) {
    // Update value cards
    updateValueCards(data);
    
    // Update gauges
    updateGauges(data);
    
    // Update chart
    updateChart(data);
    
    // Update status indicators
    updateStatusIndicators(data);
}

// Update value cards
function updateValueCards(data) {
    document.getElementById('temp-value').textContent = `${data.temperature}°C`;
    document.getElementById('humidity-value').textContent = `${data.humidity}%`;
    document.getElementById('mq-value').textContent = data.mq;
    document.getElementById('aqi-value').textContent = data.aqi;
}

// Update gauge meters
function updateGauges(data) {
    // Animate gauge updates
    tempGauge.set(data.temperature);
    humidityGauge.set(data.humidity);
    mqGauge.set(data.mq);
    aqiGauge.set(data.aqi);
    
    // Update gauge display values
    document.getElementById('temp-gauge-value').textContent = `${data.temperature}°C`;
    document.getElementById('humidity-gauge-value').textContent = `${data.humidity}%`;
    document.getElementById('mq-gauge-value').textContent = data.mq;
    document.getElementById('aqi-gauge-value').textContent = data.aqi;
}

// Update live chart
function updateChart(data) {
    const timestamp = new Date().toLocaleTimeString();
    
    // Add data to historical arrays
    historicalData.timestamps.push(timestamp);
    historicalData.temperature.push(data.temperature);
    historicalData.humidity.push(data.humidity);
    historicalData.mq.push(data.mq);
    historicalData.aqi.push(data.aqi);
    
    // Keep only last N data points
    if (historicalData.timestamps.length > maxDataPoints) {
        historicalData.timestamps.shift();
        historicalData.temperature.shift();
        historicalData.humidity.shift();
        historicalData.mq.shift();
        historicalData.aqi.shift();
    }
    
    // Update chart with current chart type data
    updateChartData(currentChartType);
}

// Update chart data based on selected type
function updateChartData(type) {
    const colors = {
        temperature: '#f97316',
        humidity: '#3b82f6',
        mq: '#10b981',
        aqi: '#8b5cf6'
    };
    
    const labels = {
        temperature: 'Temperature (°C)',
        humidity: 'Humidity (%)',
        mq: 'MQ Gas Level',
        aqi: 'Air Quality Index'
    };
    
    liveChart.data.labels = historicalData.timestamps;
    liveChart.data.datasets[0].data = historicalData[type];
    liveChart.data.datasets[0].label = labels[type];
    liveChart.data.datasets[0].borderColor = colors[type];
    liveChart.data.datasets[0].backgroundColor = colors[type] + '20';
    liveChart.update();
}

// Update status indicators
function updateStatusIndicators(data) {
    // Temperature status
    const tempStatus = data.temperature <= 30 ? 'Normal' : data.temperature <= 40 ? 'Warm' : 'Hot';
    document.getElementById('temp-status').textContent = tempStatus;
    
    // Humidity status
    const humidityStatus = data.humidity <= 30 ? 'Dry' : data.humidity <= 60 ? 'Comfortable' : 'Humid';
    document.getElementById('humidity-status').textContent = humidityStatus;
    
    // MQ Gas status
    const mqStatus = data.mq <= 100 ? 'Clean' : data.mq <= 300 ? 'Moderate' : 'High';
    document.getElementById('mq-status').textContent = mqStatus;
    
    // AQI status
    const aqiStatus = getAQIStatus(data.aqi);
    const aqiStatusElement = document.getElementById('aqi-status');
    aqiStatusElement.textContent = aqiStatus.text;
    aqiStatusElement.className = `px-3 py-1 rounded-full text-xs font-semibold ${aqiStatus.class}`;
}

// Get AQI status
function getAQIStatus(aqi) {
    if (aqi <= 50) {
        return { text: 'Good', class: 'status-good' };
    } else if (aqi <= 100) {
        return { text: 'Moderate', class: 'status-moderate' };
    } else if (aqi <= 200) {
        return { text: 'Unhealthy', class: 'status-unhealthy' };
    } else {
        return { text: 'Dangerous', class: 'status-dangerous' };
    }
}

// Update last updated time
function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-updated').textContent = timeString;
}

// Show error message
function showErrorMessage(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Toggle chart type
function toggleChart(type) {
    currentChartType = type;
    
    // Update button states
    document.querySelectorAll('.chart-toggle').forEach(btn => {
        btn.classList.remove('bg-opacity-40');
        btn.classList.add('bg-opacity-20');
    });
    
    const activeBtn = document.querySelector(`[data-chart="${type}"]`);
    activeBtn.classList.remove('bg-opacity-20');
    activeBtn.classList.add('bg-opacity-40');
    
    // Update chart
    updateChartData(type);
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            document.querySelectorAll('.sidebar-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Here you could load different content based on the section
            const section = this.getAttribute('href').substring(1);
            console.log('Loading section:', section);
        });
    });
    
    // Window resize handler
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
        }
    });
}

// Start data fetching
function startDataFetching() {
    // Initial fetch
    fetchData();
    
    // Fetch data every 2 seconds
    setInterval(fetchData, 2000);
}

// Initialize with sample data for demonstration
function initializeSampleData() {
    const sampleData = {
        temperature: 28,
        humidity: 65,
        mq: 320,
        aqi: 140
    };
    
    updateDashboard(sampleData);
    updateLastUpdated();
}

// Fallback if API fails
function initializeWithFallbackData() {
    console.log('Initializing with fallback data');
    
    // Generate some sample data points
    for (let i = 0; i < 10; i++) {
        const timestamp = new Date(Date.now() - (9 - i) * 120000).toLocaleTimeString();
        historicalData.timestamps.push(timestamp);
        historicalData.temperature.push(25 + Math.random() * 10);
        historicalData.humidity.push(50 + Math.random() * 30);
        historicalData.mq.push(200 + Math.random() * 200);
        historicalData.aqi.push(50 + Math.random() * 150);
    }
    
    initializeSampleData();
    updateChartData(currentChartType);
}

// Handle connection errors
window.addEventListener('online', function() {
    console.log('Connection restored');
    fetchData();
});

window.addEventListener('offline', function() {
    console.log('Connection lost');
    showErrorMessage('Connection lost. Using cached data.');
});

// Initialize dashboard with fallback data if needed
setTimeout(() => {
    if (historicalData.timestamps.length === 0) {
        initializeWithFallbackData();
    }
}, 3000);
