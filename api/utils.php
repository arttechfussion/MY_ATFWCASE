<?php
/**
 * Utility Functions
 * Shared helper functions for API endpoints
 */

/**
 * Send JSON response and exit
 * @param bool $success
 * @param string $message
 * @param mixed $data
 */
function sendResponse($success, $message, $data = null) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

/**
 * Format URL by adding https:// prefix if missing
 * @param string $url
 * @return string
 */
function formatUrl($url) {
    $url = trim($url);
    if (!preg_match('/^https?:\/\//', $url)) {
        return 'https://' . $url;
    }
    return $url;
}

/**
 * Validate required fields in data array
 * @param array $fields
 * @param array $data
 * @return string|null Error message or null if valid
 */
function validateRequired($fields, $data) {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            return "Field '$field' is required";
        }
    }
    return null;
}

/**
 * Validate session and ensure admin is logged in
 */
function validateSession() {
    session_start();
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        sendResponse(false, 'Unauthorized access', null);
    }
}

/**
 * Set CORS headers for cross-origin requests
 */
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }
}
