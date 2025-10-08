-- ============================================
-- ATF Showcase - Complete Database Setup
-- Run this file once to set up everything
-- ============================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS atf_showcase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE atf_showcase;

-- Drop existing tables in correct order
DROP TABLE IF EXISTS web_entries;
DROP TABLE IF EXISTS uploaded_images;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS admin_login;

-- ============================================
-- Create Tables
-- ============================================

-- 1. Admin login table
CREATE TABLE admin_login (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Categories table
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(150) NOT NULL UNIQUE,
  created_at DATE NOT NULL,
  created_time TIME NOT NULL,
  updated_at DATE DEFAULT NULL,
  updated_time TIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Uploaded images table
CREATE TABLE uploaded_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  filepath VARCHAR(500) NOT NULL,
  is_attached ENUM('attached', 'unattached') DEFAULT 'unattached',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_filename (filename),
  INDEX idx_attached (is_attached)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Web entries table
CREATE TABLE web_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  web_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  url VARCHAR(500) NOT NULL,
  category_id INT DEFAULT 1,
  image_id INT DEFAULT 1,
  date_value DATE NOT NULL,
  time_value TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date_value DESC, time_value DESC),
  INDEX idx_category (category_id),
  INDEX idx_image (image_id),
  FULLTEXT INDEX ftx_search (web_name, description, url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Insert Default Data
-- ============================================

-- 1. Default placeholder image (ID = 1)
INSERT INTO uploaded_images (id, filename, filepath, is_attached, uploaded_at) 
VALUES (1, 'placeholder-img.png', 'IMG/placeholder-img.png', 'attached', NOW());

-- 2. Default category (ID = 1)
INSERT INTO categories (id, category_name, created_at, created_time)
VALUES (1, 'Unassigned', CURDATE(), CURTIME());

-- 3. Admin user
INSERT INTO admin_login (username, password) 
VALUES ('admin', 'admin@123');

-- 4. Sample categories
INSERT INTO categories (category_name, created_at, created_time) VALUES 
('Technology', CURDATE(), CURTIME()),
('Education', CURDATE(), CURTIME()),
('Business', CURDATE(), CURTIME()),
('Entertainment', CURDATE(), CURTIME());

-- ============================================
-- Verify Setup
-- ============================================
SELECT 'Database setup complete!' as Status;
SELECT COUNT(*) as 'Total Categories' FROM categories;
SELECT COUNT(*) as 'Total Images' FROM uploaded_images;
SELECT COUNT(*) as 'Total Entries' FROM web_entries;
SELECT username, 'Password: admin@123' as Info FROM admin_login WHERE username = 'admin';

-- ============================================
-- Setup Complete!
-- Default Login: admin / admin@123
-- Default Category ID: 1 (Unassigned)
-- Default Image ID: 1 (placeholder-img.png)
-- ============================================
