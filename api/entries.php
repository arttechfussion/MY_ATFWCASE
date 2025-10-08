<?php
/**
 * Entries API
 * Handles CRUD operations for website entries
 */

require_once 'db.php';
require_once 'utils.php';
require_once 'image_handler.php';

setCorsHeaders();

// Initialize database
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendResponse(false, 'Database connection failed', null);
}

// Handle GET request - return all entries
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    getAllEntries($db);
    exit;
}

// Handle POST request - create, update, delete, stats
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$params = $input['params'] ?? [];

// Log the action for debugging
error_log("Entries API - Action: $action");

// Validate session for write operations (not for read operations)
if (in_array($action, ['createWebsite', 'updateWebsite', 'deleteWebsite'])) {
    validateSession();
}

switch ($action) {
    case 'getAllWebsites':
        getAllEntries($db);
        break;
    
    case 'createWebsite':
        createEntry($db, $params);
        break;
    
    case 'updateWebsite':
        updateEntry($db, $params);
        break;
    
    case 'deleteWebsite':
        deleteEntry($db, $params);
        break;
    
    case 'getAdminDashboardStats':
        getAdminDashboardStats($db);
        break;
    
    default:
        sendResponse(false, 'Invalid action', null);
}

/**
 * Get all entries with category names and image info
 */
function getAllEntries($db) {
    try {
        $query = "SELECT 
                    we.id, 
                    we.web_name, 
                    we.description, 
                    we.url, 
                    c.category_name as category, 
                    we.image_id,
                    ui.filepath as image,
                    we.date_value as date_added,
                    we.time_value as time_added,
                    we.category_id
                  FROM web_entries we
                  JOIN categories c ON we.category_id = c.id
                  LEFT JOIN uploaded_images ui ON we.image_id = ui.id
                  ORDER BY we.date_value DESC, we.time_value DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $entries = $stmt->fetchAll();
        
        // Format for frontend compatibility
        $formattedEntries = array_map(function($entry) {
            return [
                'id' => $entry['id'],
                'name' => $entry['web_name'],
                'web_name' => $entry['web_name'],
                'description' => $entry['description'],
                'url' => $entry['url'],
                'category' => $entry['category'],
                'image' => $entry['image'] ?? 'IMG/placeholder-img.png',
                'image_id' => $entry['image_id'],
                'date_added' => $entry['date_added'],
                'time_added' => $entry['time_added'],
                'category_id' => $entry['category_id']
            ];
        }, $entries);
        
        // Return array directly (not wrapped in response object) for compatibility
        header('Content-Type: application/json');
        echo json_encode($formattedEntries);
        exit;
    } catch (PDOException $e) {
        error_log("Get entries error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve entries', null);
    }
}

/**
 * Create new entry
 */
function createEntry($db, $params) {
    // Validate required fields
    $error = validateRequired(['web_name', 'url', 'category_id', 'description'], $params);
    if ($error) {
        sendResponse(false, $error, null);
    }

    $webName = trim($params['web_name']);
    $description = trim($params['description']);
    $url = formatUrl(trim($params['url']));
    $categoryId = $params['category_id'];
    $imageId = $params['image_id'] ?? 1; // Default to 1 (placeholder)
    
    // Log for debugging
    error_log("Creating entry: name=$webName, url=$url, category=$categoryId, image_id=$imageId");

    try {
        // Insert new entry with image_id
        $query = "INSERT INTO web_entries 
                  (web_name, description, url, category_id, image_id, date_value, time_value) 
                  VALUES (:web_name, :description, :url, :category_id, :image_id, CURDATE(), CURTIME())";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':web_name', $webName);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':url', $url);
        $stmt->bindParam(':category_id', $categoryId);
        $stmt->bindParam(':image_id', $imageId);
        $stmt->execute();
        
        $entryId = $db->lastInsertId();
        
        // Update image status to 'attached' if not default
        if ($imageId != 1) {
            $updateImageQuery = "UPDATE uploaded_images SET is_attached = 'attached' WHERE id = :image_id";
            $updateStmt = $db->prepare($updateImageQuery);
            $updateStmt->bindParam(':image_id', $imageId);
            $updateStmt->execute();
        }
        
        sendResponse(true, 'Entry created successfully', ['id' => $entryId]);
    } catch (PDOException $e) {
        error_log("Create entry error: " . $e->getMessage());
        sendResponse(false, 'Failed to create entry', null);
    }
}

/**
 * Update existing entry
 */
function updateEntry($db, $params) {
    // Validate required fields
    $error = validateRequired(['id', 'web_name', 'url', 'category_id', 'description'], $params);
    if ($error) {
        sendResponse(false, $error, null);
    }

    $id = $params['id'];
    $webName = trim($params['web_name']);
    $description = trim($params['description']);
    $url = formatUrl(trim($params['url']));
    $categoryId = $params['category_id'];
    $newImageId = $params['image_id'] ?? null;

    try {
        // Get current entry to check for existing image
        $checkQuery = "SELECT image_id FROM web_entries WHERE id = :id LIMIT 1";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':id', $id);
        $checkStmt->execute();
        $currentEntry = $checkStmt->fetch();

        if (!$currentEntry) {
            sendResponse(false, 'Entry not found', null);
        }

        $oldImageId = $currentEntry['image_id'];
        $imageIdToUse = $newImageId !== null ? $newImageId : $oldImageId;

        // Update entry with new date and time
        $query = "UPDATE web_entries 
                  SET web_name = :web_name, 
                      description = :description, 
                      url = :url, 
                      category_id = :category_id, 
                      image_id = :image_id,
                      date_value = CURDATE(),
                      time_value = CURTIME()
                  WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':web_name', $webName);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':url', $url);
        $stmt->bindParam(':category_id', $categoryId);
        $stmt->bindParam(':image_id', $imageIdToUse);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        // Update image attachment status
        if ($newImageId !== null && $newImageId != $oldImageId) {
            // Mark new image as attached
            if ($newImageId != 1) {
                $updateNewQuery = "UPDATE uploaded_images SET is_attached = 'attached' WHERE id = :image_id";
                $updateNewStmt = $db->prepare($updateNewQuery);
                $updateNewStmt->bindParam(':image_id', $newImageId);
                $updateNewStmt->execute();
            }
            
            // Check if old image is still used by other entries
            if ($oldImageId != 1) {
                $checkOldQuery = "SELECT COUNT(*) as count FROM web_entries WHERE image_id = :image_id AND id != :entry_id";
                $checkOldStmt = $db->prepare($checkOldQuery);
                $checkOldStmt->bindParam(':image_id', $oldImageId);
                $checkOldStmt->bindParam(':entry_id', $id);
                $checkOldStmt->execute();
                $oldImageUsage = $checkOldStmt->fetch()['count'];
                
                // If not used by any other entry, mark as unattached
                if ($oldImageUsage == 0) {
                    $updateOldQuery = "UPDATE uploaded_images SET is_attached = 'unattached' WHERE id = :image_id";
                    $updateOldStmt = $db->prepare($updateOldQuery);
                    $updateOldStmt->bindParam(':image_id', $oldImageId);
                    $updateOldStmt->execute();
                }
            }
        }
        
        sendResponse(true, 'Entry updated successfully', null);
    } catch (PDOException $e) {
        error_log("Update entry error: " . $e->getMessage());
        sendResponse(false, 'Failed to update entry', null);
    }
}

/**
 * Delete entry and update image status
 */
function deleteEntry($db, $params) {
    // Validate required fields
    $error = validateRequired(['id'], $params);
    if ($error) {
        sendResponse(false, $error, null);
    }

    $id = $params['id'];

    try {
        // Get image_id before deletion
        $query = "SELECT image_id FROM web_entries WHERE id = :id LIMIT 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $entry = $stmt->fetch();

        if (!$entry) {
            sendResponse(false, 'Entry not found', null);
        }

        $imageId = $entry['image_id'];

        // Delete database record
        $deleteQuery = "DELETE FROM web_entries WHERE id = :id";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->bindParam(':id', $id);
        $deleteStmt->execute();

        // Check if image is still used by other entries
        if ($imageId != 1) {
            $checkQuery = "SELECT COUNT(*) as count FROM web_entries WHERE image_id = :image_id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':image_id', $imageId);
            $checkStmt->execute();
            $imageUsage = $checkStmt->fetch()['count'];
            
            // If not used by any entry, mark as unattached
            if ($imageUsage == 0) {
                $updateQuery = "UPDATE uploaded_images SET is_attached = 'unattached' WHERE id = :image_id";
                $updateStmt = $db->prepare($updateQuery);
                $updateStmt->bindParam(':image_id', $imageId);
                $updateStmt->execute();
            }
        }

        sendResponse(true, 'Entry deleted successfully', null);
    } catch (PDOException $e) {
        error_log("Delete entry error: " . $e->getMessage());
        sendResponse(false, 'Failed to delete entry', null);
    }
}

/**
 * Get admin dashboard statistics
 */
function getAdminDashboardStats($db) {
    try {
        // Total websites
        $totalQuery = "SELECT COUNT(*) as total FROM web_entries";
        $totalStmt = $db->prepare($totalQuery);
        $totalStmt->execute();
        $totalResult = $totalStmt->fetch();
        $totalSites = $totalResult['total'];

        // New websites (last 7 days)
        $newQuery = "SELECT COUNT(*) as new_count 
                     FROM web_entries 
                     WHERE date_value >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        $newStmt = $db->prepare($newQuery);
        $newStmt->execute();
        $newResult = $newStmt->fetch();
        $newSites = $newResult['new_count'];

        // Total categories
        $catQuery = "SELECT COUNT(*) as total FROM categories";
        $catStmt = $db->prepare($catQuery);
        $catStmt->execute();
        $catResult = $catStmt->fetch();
        $totalCategories = $catResult['total'];

        $stats = [
            'totalSites' => $totalSites,
            'newSites' => $newSites,
            'totalCategories' => $totalCategories
        ];

        sendResponse(true, 'Statistics retrieved successfully', $stats);
    } catch (PDOException $e) {
        error_log("Get stats error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve statistics', null);
    }
}
