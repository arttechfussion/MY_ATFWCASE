<?php
/**
 * Image Handling Utilities
 * Functions for uploading, validating, and deleting images
 */

/**
 * Handle image upload from base64 data
 * @param string $base64Image Base64 encoded image data
 * @return array ['success' => bool, 'message' => string, 'path' => string|null]
 */
function handleImageUpload($base64Image) {
    // Validate base64 format
    if (empty($base64Image)) {
        return ['success' => false, 'message' => 'No image data provided', 'path' => null];
    }

    // Extract image data and mime type
    if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $matches)) {
        $imageType = strtolower($matches[1]);
        $base64Image = substr($base64Image, strpos($base64Image, ',') + 1);
    } else {
        return ['success' => false, 'message' => 'Invalid image format', 'path' => null];
    }

    // Validate mime type
    $allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    if (!in_array($imageType, $allowedTypes)) {
        return ['success' => false, 'message' => 'Invalid image type. Allowed: jpeg, png, gif, webp', 'path' => null];
    }

    // Decode base64
    $imageData = base64_decode($base64Image);
    if ($imageData === false) {
        return ['success' => false, 'message' => 'Failed to decode image data', 'path' => null];
    }

    // Validate file size (max 5MB)
    $maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (strlen($imageData) > $maxSize) {
        return ['success' => false, 'message' => 'Image size exceeds 5MB limit', 'path' => null];
    }

    // Generate unique filename
    $extension = $imageType === 'jpeg' ? 'jpg' : $imageType;
    $filename = time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
    
    // Define upload directory
    $uploadDir = __DIR__ . '/../IMG/';
    
    // Create directory if it doesn't exist
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Save file
    $filePath = $uploadDir . $filename;
    if (file_put_contents($filePath, $imageData) === false) {
        return ['success' => false, 'message' => 'Failed to save image file', 'path' => null];
    }

    // Return relative path
    $relativePath = 'IMG/' . $filename;
    return ['success' => true, 'message' => 'Image uploaded successfully', 'path' => $relativePath];
}

/**
 * Delete image file from filesystem
 * @param string $imagePath Relative path to image (e.g., IMG/filename.jpg)
 * @return bool Success status
 */
function deleteImage($imagePath) {
    if (empty($imagePath)) {
        return true; // No image to delete
    }

    // Don't delete default placeholder (any extension)
    if (preg_match('/placeholder-img\.(png|jpg|jpeg|gif|webp)$/i', $imagePath)) {
        return true;
    }

    // Validate path is within IMG/ directory
    if (strpos($imagePath, 'IMG/') !== 0) {
        error_log("Invalid image path: $imagePath");
        return false;
    }

    // Build full path
    $fullPath = __DIR__ . '/../' . $imagePath;

    // Check if file exists
    if (!file_exists($fullPath)) {
        error_log("Image file not found: $fullPath");
        return true; // File doesn't exist, consider it deleted
    }

    // Delete file
    if (unlink($fullPath)) {
        return true;
    } else {
        error_log("Failed to delete image: $fullPath");
        return false;
    }
}

/**
 * Move image to temp folder instead of deleting
 * @param string $imagePath Relative path to image (e.g., IMG/filename.jpg)
 * @return bool Success status
 */
function moveImageToTemp($imagePath) {
    if (empty($imagePath)) {
        return true;
    }

    // Don't move default placeholder (any extension)
    if (preg_match('/placeholder-img\.(png|jpg|jpeg|gif|webp)$/i', $imagePath)) {
        return true;
    }

    // Don't move if already in temp
    if (strpos($imagePath, 'temp-img/') !== false) {
        return true;
    }

    // Validate path
    if (strpos($imagePath, 'IMG/') !== 0) {
        return false;
    }

    $fullPath = __DIR__ . '/../' . $imagePath;
    
    if (!file_exists($fullPath)) {
        return true; // File doesn't exist
    }

    // Create temp directory if it doesn't exist
    $tempDir = __DIR__ . '/../IMG/temp-img/';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0755, true);
    }

    // Get filename and move to temp
    $filename = basename($imagePath);
    $tempPath = $tempDir . $filename;

    if (rename($fullPath, $tempPath)) {
        error_log("Moved image to temp: $imagePath -> temp-img/$filename");
        return true;
    } else {
        error_log("Failed to move image to temp: $imagePath");
        return false;
    }
}

/**
 * Validate image data before processing
 * @param string $base64Image Base64 encoded image data
 * @return array ['valid' => bool, 'error' => string|null]
 */
function validateImageData($base64Image) {
    if (empty($base64Image)) {
        return ['valid' => false, 'error' => 'No image data provided'];
    }

    // Check base64 format
    if (!preg_match('/^data:image\/(\w+);base64,/', $base64Image, $matches)) {
        return ['valid' => false, 'error' => 'Invalid image format'];
    }

    $imageType = strtolower($matches[1]);
    $allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    
    if (!in_array($imageType, $allowedTypes)) {
        return ['valid' => false, 'error' => 'Invalid image type'];
    }

    return ['valid' => true, 'error' => null];
}

/**
 * Delete all unattached images from database and filesystem
 * @param PDO $db Database connection
 * @return array ['success' => bool, 'message' => string, 'data' => array]
 */
function deleteUnattachedImages($db) {
    try {
        // Get all unattached images (excluding placeholder)
        $query = "SELECT id, filepath FROM uploaded_images 
                  WHERE is_attached = 'unattached' 
                  AND id != 1 
                  AND filename NOT LIKE 'placeholder-img%'";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $unattachedImages = $stmt->fetchAll();
        
        $deletedCount = 0;
        $errors = [];
        
        foreach ($unattachedImages as $image) {
            // Delete from filesystem
            $deleted = deleteImage($image['filepath']);
            
            if ($deleted) {
                // Delete from database
                $deleteQuery = "DELETE FROM uploaded_images WHERE id = :id";
                $deleteStmt = $db->prepare($deleteQuery);
                $deleteStmt->execute(['id' => $image['id']]);
                $deletedCount++;
            } else {
                $errors[] = "Failed to delete: " . $image['filepath'];
            }
        }
        
        if (count($errors) > 0) {
            error_log("Errors deleting unattached images: " . implode(", ", $errors));
        }
        
        sendResponse(true, "Deleted $deletedCount unattached image(s)", [
            'totalDeleted' => $deletedCount,
            'errors' => $errors
        ]);
        
    } catch (PDOException $e) {
        error_log("Delete unattached images error: " . $e->getMessage());
        sendResponse(false, 'Failed to delete unattached images', null);
    }
}
