<?php
/**
 * Authentication API
 * Handles login, session verification, and logout
 */

require_once 'db.php';
require_once 'utils.php';

 // Set session timeout to 24 hours
    ini_set('session.gc_maxlifetime', 86400);

// Start session
    session_start();


setCorsHeaders();

// Get request input
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$params = $input['params'] ?? [];

// Initialize database
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendResponse(false, 'Database connection failed', null);
}

switch ($action) {
    case 'login':
        handleLogin($db, $params);
        break;
    
    case 'verify':
        handleVerify($params);
        break;
    
    case 'logout':
        handleLogout();
        break;
    
    default:
        sendResponse(false, 'Invalid action', null);
}

/**
 * Handle login action
 */
function handleLogin($db, $params) {
    // Validate required fields
    $error = validateRequired(['username', 'password'], $params);
    if ($error) {
        sendResponse(false, $error, null);
    }

    $username = trim($params['username']);
    $password = trim($params['password']);

    try {
        // Query admin_login table
        $query = "SELECT id, username, password FROM admin_login WHERE username = :username LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':username', $username);
        $stmt->execute();

        $admin = $stmt->fetch();

        if ($admin && $password === $admin['password']) {
            
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_username'] = $admin['username'];
            $_SESSION['login_time'] = time();
            
           
            
            $sessionId = session_id();
            
            sendResponse(true, 'Login successful', ['token' => $sessionId]);
        } else {
            sendResponse(false, 'Invalid username or password', null);
        }
    } catch (PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        sendResponse(false, 'Login failed', null);
    }
}

/**
 * Handle verify action
 */
function handleVerify($params) {
    session_start();
    
    // Check if session is valid
    if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        // Check session timeout (24 hours)
        if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time'] > 86400)) {
            session_destroy();
            sendResponse(false, 'Session expired', null);
        }
        
        sendResponse(true, 'Session valid', [
            'username' => $_SESSION['admin_username'] ?? 'admin'
        ]);
    } else {
        sendResponse(false, 'Invalid session', null);
    }
}

/**
 * Handle logout action
 */
function handleLogout() {
    session_start();
    session_destroy();
    sendResponse(true, 'Logged out successfully', null);
}
