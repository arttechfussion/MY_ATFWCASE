<?php
/**
 * System Statistics API
 * Get file system statistics and manage images
 */

require_once 'utils.php';
require_once 'db.php';

setCorsHeaders();

// Get request input
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$params = $input['params'] ?? [];

// Initialize database
$database = new Database();
$db = $database->getConnection();

switch ($action) {
    case 'scanSystem':
        scanSystem($db);
        break;
    
    case 'fixOrphanedEntries':
        fixOrphanedEntries($db);
        break;
    
    case 'getUploadedImages':
        getUploadedImages($db);
        break;
    
    case 'uploadImage':
        uploadImage($db, $params);
        break;
    
    case 'checkDuplicateFilename':
        checkDuplicateFilename($params);
        break;
    
    case 'deleteUnattachedImages':
        require_once 'image_handler.php';
        deleteUnattachedImages($db);
        break;
    
    default:
        sendResponse(false, 'Invalid action', null);
}

/**
 * Fix orphaned entries by moving them to default category (ID = 1)
 */
function fixOrphanedEntries($db) {
    try {
        // Fix entries with invalid category_id (move to default ID = 1)
        $fixCategoryQuery = "UPDATE web_entries 
                             SET category_id = 1 
                             WHERE category_id NOT IN (SELECT id FROM categories) 
                             OR category_id IS NULL";
        $fixCategoryStmt = $db->prepare($fixCategoryQuery);
        $fixCategoryStmt->execute();
        $categoryFixed = $fixCategoryStmt->rowCount();
        
        // Fix entries with invalid image_id (set to default ID = 1)
        $fixImageQuery = "UPDATE web_entries 
                          SET image_id = 1 
                          WHERE image_id NOT IN (SELECT id FROM uploaded_images)";
        $fixImageStmt = $db->prepare($fixImageQuery);
        $fixImageStmt->execute();
        $imageFixed = $fixImageStmt->rowCount();
        
        $totalFixed = $categoryFixed + $imageFixed;
        
        sendResponse(true, "Fixed $totalFixed orphaned entry/entries", [
            'categoryFixed' => $categoryFixed,
            'imageFixed' => $imageFixed,
            'totalFixed' => $totalFixed
        ]);
    } catch (Exception $e) {
        error_log("Fix orphaned entries error: " . $e->getMessage());
        sendResponse(false, 'Failed to fix orphaned entries', null);
    }
}

/**
 * Comprehensive system scan using uploaded_images table
 */
function scanSystem($db) {
    try {
        // Get total images (excluding default id=1 and placeholder)
        $totalQuery = "SELECT COUNT(*) as total FROM uploaded_images WHERE id != 1 AND filename NOT LIKE 'placeholder-img%'";
        $totalStmt = $db->prepare($totalQuery);
        $totalStmt->execute();
        $totalImages = $totalStmt->fetch()['total'];
        
        // Get attached images
        $attachedQuery = "SELECT COUNT(*) as total FROM uploaded_images WHERE is_attached = 'attached' AND id != 1 AND filename NOT LIKE 'placeholder-img%'";
        $attachedStmt = $db->prepare($attachedQuery);
        $attachedStmt->execute();
        $attachedImages = $attachedStmt->fetch()['total'];
        
        // Get unattached images
        $unattachedQuery = "SELECT COUNT(*) as total FROM uploaded_images WHERE is_attached = 'unattached' AND id != 1 AND filename NOT LIKE 'placeholder-img%'";
        $unattachedStmt = $db->prepare($unattachedQuery);
        $unattachedStmt->execute();
        $unattachedImages = $unattachedStmt->fetch()['total'];
        
        // Get total entries
        $entryQuery = "SELECT COUNT(*) as total FROM web_entries";
        $entryStmt = $db->prepare($entryQuery);
        $entryStmt->execute();
        $totalEntries = $entryStmt->fetch()['total'];
        
        // Get total categories
        $catQuery = "SELECT COUNT(*) as total FROM categories";
        $catStmt = $db->prepare($catQuery);
        $catStmt->execute();
        $totalCategories = $catStmt->fetch()['total'];
        
        // Get orphaned entries (invalid category_id or image_id)
        $orphanQuery = "SELECT COUNT(*) as total FROM web_entries 
                        WHERE category_id NOT IN (SELECT id FROM categories) 
                        OR category_id IS NULL
                        OR image_id NOT IN (SELECT id FROM uploaded_images)";
        $orphanStmt = $db->prepare($orphanQuery);
        $orphanStmt->execute();
        $orphanedEntries = $orphanStmt->fetch()['total'];
        
        sendResponse(true, 'System scan complete', [
            'totalImages' => $totalImages,
            'attachedImages' => $attachedImages,
            'unattachedImages' => $unattachedImages,
            'totalEntries' => $totalEntries,
            'totalCategories' => $totalCategories,
            'orphanedEntries' => $orphanedEntries
        ]);
    } catch (Exception $e) {
        error_log("System scan error: " . $e->getMessage());
        sendResponse(false, 'Failed to scan system', null);
    }
}

/**
 * Get all uploaded images for gallery (excluding default placeholder)
 */
function getUploadedImages($db) {
    try {
        // Get all images from uploaded_images table (including placeholder)
        $query = "SELECT id, filename, filepath, is_attached, uploaded_at 
                  FROM uploaded_images 
                  ORDER BY uploaded_at DESC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format for frontend
        $formattedImages = array_map(function($img) {
            return [
                'id' => $img['id'],
                'filename' => $img['filename'],
                'filepath' => $img['filepath'],
                'isAttached' => $img['is_attached'] === 'attached',
                'uploadedAt' => $img['uploaded_at']
            ];
        }, $images);
        
        sendResponse(true, 'Images retrieved', ['images' => $formattedImages]);
    } catch (Exception $e) {
        error_log("Get uploaded images error: " . $e->getMessage());
        sendResponse(false, 'Failed to get images', null);
    }
}

/**
 * Upload image from gallery popup and save to uploaded_images table
 */
function uploadImage($db, $params) {
    try {
        $imageBase64 = $params['image_base64'] ?? null;
        
        if (empty($imageBase64)) {
            sendResponse(false, 'No image provided', null);
        }
        
        // Decode base64
        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $imageBase64));
        if ($imageData === false) {
            sendResponse(false, 'Invalid image data', null);
        }
        
        // Generate unique filename
        $extension = 'png'; // Default
        if (preg_match('#^data:image/(\w+);base64,#i', $imageBase64, $matches)) {
            $extension = $matches[1];
        }
        
        $filename = 'img_' . time() . '_' . uniqid() . '.' . $extension;
        $filepath = __DIR__ . '/../IMG/' . $filename;
        $dbFilepath = 'IMG/' . $filename;
        
        // Check for duplicate filename
        if (file_exists($filepath)) {
            sendResponse(false, 'Filename already exists', null);
        }
        
        // Save file
        if (file_put_contents($filepath, $imageData) === false) {
            sendResponse(false, 'Failed to save image', null);
        }
        
        // Insert into uploaded_images table
        $query = "INSERT INTO uploaded_images (filename, filepath, is_attached) 
                  VALUES (:filename, :filepath, 'unattached')";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':filename', $filename);
        $stmt->bindParam(':filepath', $dbFilepath);
        $stmt->execute();
        
        $imageId = $db->lastInsertId();
        
        sendResponse(true, 'Image uploaded successfully', [
            'id' => $imageId,
            'filename' => $filename,
            'filepath' => $dbFilepath
        ]);
    } catch (Exception $e) {
        error_log("Upload image error: " . $e->getMessage());
        sendResponse(false, 'Failed to upload image', null);
    }
}

/**
 * Check if filename already exists
 */
function checkDuplicateFilename($params) {
    try {
        $filename = $params['filename'] ?? '';
        
        if (empty($filename)) {
            sendResponse(false, 'No filename provided', null);
        }
        
        $imgDir = __DIR__ . '/../IMG/';
        $filepath = $imgDir . $filename;
        
        $exists = file_exists($filepath);
        
        sendResponse(true, $exists ? 'Filename exists' : 'Filename available', [
            'exists' => $exists
        ]);
    } catch (Exception $e) {
        error_log("Check duplicate error: " . $e->getMessage());
        sendResponse(false, 'Failed to check filename', null);
    }
}
