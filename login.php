<?php
session_start();

// Check if already logged in
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    header('Location: dashboard.php');
    exit();
}

// Handle login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    // Simple authentication (in production, use proper password hashing)
    if ($username === 'admin' && $password === 'admin123') {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = $username;
        $_SESSION['login_time'] = time();
        
        header('Location: dashboard.php');
        exit();
    } else {
        $error = 'Invalid username or password';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Air Quality Monitoring</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        * {
            font-family: 'Inter', sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .glassmorphism {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        
        .login-glow {
            animation: glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
            from { box-shadow: 0 0 10px rgba(102, 126, 234, 0.5); }
            to { box-shadow: 0 0 20px rgba(102, 126, 234, 0.8), 0 0 30px rgba(102, 126, 234, 0.6); }
        }
        
        .input-glow:focus {
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.5);
        }
    </style>
</head>
<body class="flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo and Title -->
        <div class="text-center mb-8">
            <div class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 login-glow">
                <i class="fas fa-wind text-3xl text-purple-600"></i>
            </div>
            <h1 class="text-3xl font-bold text-white mb-2">Admin Portal</h1>
            <p class="text-purple-200">Air Quality Monitoring System</p>
        </div>
        
        <!-- Login Form -->
        <div class="glassmorphism p-8">
            <?php if (isset($error)): ?>
                <div class="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 px-4 py-3 rounded-lg mb-6">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    <?php echo $error; ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" class="space-y-6">
                <div>
                    <label for="username" class="block text-white text-sm font-medium mb-2">
                        <i class="fas fa-user mr-2"></i>Username
                    </label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username" 
                        required
                        class="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 input-glow transition-all duration-300"
                        placeholder="Enter username"
                        value="admin"
                    >
                </div>
                
                <div>
                    <label for="password" class="block text-white text-sm font-medium mb-2">
                        <i class="fas fa-lock mr-2"></i>Password
                    </label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required
                        class="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 input-glow transition-all duration-300"
                        placeholder="Enter password"
                        value="admin123"
                    >
                </div>
                
                <button 
                    type="submit" 
                    class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
                >
                    <i class="fas fa-sign-in-alt mr-2"></i>
                    Login to Dashboard
                </button>
            </form>
            
            <div class="mt-6 text-center">
                <p class="text-purple-200 text-sm">
                    <i class="fas fa-info-circle mr-2"></i>
                    Default: admin / admin123
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="text-center mt-8">
            <p class="text-purple-200 text-sm">
                <i class="fas fa-shield-alt mr-2"></i>
                Secure Admin Access
            </p>
        </div>
    </div>
</body>
</html>
