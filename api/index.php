<?php
/**
 * API Router
 * Routes requests to appropriate API endpoints based on action
 */

require_once 'utils.php';

setCorsHeaders();

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$params = $input['params'] ?? [];

// Route based on action
switch ($action) {
    // Category actions
    case 'getCategories':
        require_once 'categories.php';
        break;
    
    case 'createCategory':
    case 'updateCategory':
    case 'deleteCategory':
        require_once 'categories.php';
        break;
    
    // Website entry actions
    case 'getAllWebsites':
    case 'createWebsite':
    case 'updateWebsite':
    case 'deleteWebsite':
    case 'getAdminDashboardStats':
        require_once 'entries.php';
        break;
    
    // Auth actions
    case 'login':
    case 'verify':
    case 'logout':
        require_once 'auth.php';
        break;
    
    // System stats and image management
    case 'getImageStats':
    case 'cleanTempImages':
    case 'scanSystem':
    case 'fixOrphanedEntries':
    case 'moveUnattachedToTemp':
    case 'getUploadedImages':
    case 'uploadImage':
    case 'checkDuplicateFilename':
    case 'deleteUnattachedImages':
        require_once 'system_stats.php';
        break;
    
    default:
        sendResponse(false, 'Unknown action: ' . $action, null);
}
