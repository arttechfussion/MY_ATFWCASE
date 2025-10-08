<?php
/**
 * Categories API
 * Handles CRUD operations for website categories
 */

require_once 'db.php';
require_once 'utils.php';

setCorsHeaders();

// Initialize database
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendResponse(false, 'Database connection failed', null);
}

// Handle GET request - return all categories
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    getAllCategories($db);
    exit;
}

// Handle POST request - create, update, delete
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$params = $input['params'] ?? [];

// Log the action for debugging
error_log("Categories API - Action: $action");

// Validate session for write operations (not for getCategories)
if (in_array($action, ['createCategory', 'updateCategory', 'deleteCategory'])) {
    validateSession();
}

switch ($action) {
    case 'getCategories':
        getAllCategories($db);
        break;
    
    case 'createCategory':
        createCategory($db, $params);
        break;
    
    case 'updateCategory':
        updateCategory($db, $params);
        break;
    
    case 'deleteCategory':
        deleteCategory($db, $params);
        break;
    
    default:
        sendResponse(false, 'Invalid action', null);
}

/**
 * Get all categories with ID 0 always on top, others sorted by updated date DESC
 */
function getAllCategories($db) {
    try {
        $query = "SELECT id, category_name, created_at, created_time, updated_at, updated_time 
                  FROM categories 
                  ORDER BY 
                    CASE WHEN id = 1 THEN 0 ELSE 1 END,
                    COALESCE(updated_at, created_at) DESC, 
                    COALESCE(updated_time, created_time) DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $categories = $stmt->fetchAll();
        
        // Format for frontend compatibility
        $formattedCategories = array_map(function($cat) {
            return [
                'id' => $cat['id'],
                'name' => $cat['category_name'],
                'date' => $cat['created_at'],
                'time' => $cat['created_time'],
                'updated_at' => $cat['updated_at'],
                'updated_time' => $cat['updated_time']
            ];
        }, $categories);
        
        // Return array directly (not wrapped in response object) for compatibility
        header('Content-Type: application/json');
        echo json_encode($formattedCategories);
        exit;
    } catch (PDOException $e) {
        error_log("Get categories error: " . $e->getMessage());
        sendResponse(false, 'Failed to retrieve categories', null);
    }
}

/**
 * Create new category
 */
function createCategory($db, $params) {
    // Validate required fields
    $error = validateRequired(['category_name'], $params);
    if ($error) {
        sendResponse(false, $error, null);
    }

    $categoryName = trim($params['category_name']);

    try {
        // Check if category already exists
        $checkQuery = "SELECT id FROM categories WHERE category_name = :category_name LIMIT 1";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':category_name', $categoryName);
        $checkStmt->execute();
        
        if ($checkStmt->fetch()) {
            sendResponse(false, 'Category already exists', null);
        }

        // Insert new category
        $query = "INSERT INTO categories (category_name, created_at, created_time) 
                  VALUES (:category_name, CURDATE(), CURTIME())";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':category_name', $categoryName);
        $stmt->execute();
        
        $categoryId = $db->lastInsertId();
        
        sendResponse(true, 'Category created successfully', ['id' => $categoryId]);
    } catch (PDOException $e) {
        error_log("Create category error: " . $e->getMessage());
        sendResponse(false, 'Failed to create category', null);
    }
}

/**
 * Update category name
 */
function updateCategory($db, $params) {
    // Validate required fields
    $error = validateRequired(['old_name', 'new_name'], $params);
    if ($error) {
        sendResponse(false, $error, null);
    }

    $oldName = trim($params['old_name']);
    $newName = trim($params['new_name']);

    try {
        // Check if new name already exists (and it's not the same category)
        $checkQuery = "SELECT id FROM categories WHERE category_name = :new_name AND category_name != :old_name LIMIT 1";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':new_name', $newName);
        $checkStmt->bindParam(':old_name', $oldName);
        $checkStmt->execute();
        
        if ($checkStmt->fetch()) {
            sendResponse(false, 'Category name already exists', null);
        }

        // Update category with updated timestamp
        $query = "UPDATE categories 
                  SET category_name = :new_name, 
                      updated_at = CURDATE(), 
                      updated_time = CURTIME() 
                  WHERE category_name = :old_name";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':new_name', $newName);
        $stmt->bindParam(':old_name', $oldName);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            sendResponse(true, 'Category updated successfully', null);
        } else {
            sendResponse(false, 'Category not found', null);
        }
    } catch (PDOException $e) {
        error_log("Update category error: " . $e->getMessage());
        sendResponse(false, 'Failed to update category', null);
    }
}

/**
 * Delete category (cascade deletes web_entries)
 */
function deleteCategory($db, $params) {
    // Validate required fields
    $error = validateRequired(['category_id'], $params);
    if ($error) {
        sendResponse(false, $error, null);
    }

    $categoryId = $params['category_id'];

    try {
        // Prevent deleting default category (ID = 1)
        if ($categoryId == 1) {
            sendResponse(false, 'Cannot delete default category', null);
        }
        
        // Move all entries from this category to default (ID = 1)
        $moveQuery = "UPDATE web_entries SET category_id = 1 WHERE category_id = :id";
        $moveStmt = $db->prepare($moveQuery);
        $moveStmt->bindParam(':id', $categoryId);
        $moveStmt->execute();
        
        // Now delete the category
        $query = "DELETE FROM categories WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $categoryId);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            sendResponse(true, 'Category deleted successfully', null);
        } else {
            sendResponse(false, 'Category not found', null);
        }
    } catch (PDOException $e) {
        error_log("Delete category error: " . $e->getMessage());
        sendResponse(false, 'Failed to delete category', null);
    }
}
