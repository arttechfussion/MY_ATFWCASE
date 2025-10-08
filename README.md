# ATF Showcase - Complete Website Management System

A professional web application for showcasing and managing websites with images, descriptions, and categories. Built with PHP, MySQL, and vanilla JavaScript.

## 🌟 Features

### User Dashboard

- Browse websites in responsive card grid (12 items/page)
- Real-time search (minimum 2 characters)
- Filter by category
- Pagination with smooth navigation
- Click to visit websites in new tab
- Mobile-responsive design

### Admin Panel

- **Dashboard**: View statistics and charts
- **Web List**: Manage all websites with search, filter, and pagination
- **Add Entry**: Create new website entries with image gallery
- **Edit Entry**: Click edit to modify existing entries (redirects to Add Entry with pre-filled data)
- **Categories**: Create, edit, and delete categories
- **Optimize**: System maintenance and cleanup tools
- **Bulk Actions**: Select and delete multiple entries at once
- **Image Gallery**: Upload and manage images from centralized gallery

### Smart Features

- **URL Validation**: Accepts all domain formats (example.com, site.store, etc.)
- **Image Gallery System**: Centralized image management with upload and selection
- **Image Status Tracking**: Attached/Unattached status for all images
- **Duplicate Prevention**: Blocks duplicate filenames automatically
- **Default Placeholder**: Automatic placeholder for entries without images (ID = 1)
- **Protected Category**: "Unassigned" category (ID = 1) cannot be deleted
- **Real-time Updates**: Changes reflect immediately without page refresh
- **Bulk Delete**: Select multiple items and delete at once
- **Edit Mode**: Edit button redirects to Add Entry with pre-filled data
- **Smart Form Reset**: Form resets after add, redirects after update

## 📋 Requirements

- **XAMPP** (or any PHP + MySQL environment)
  - PHP 7.4 or higher
  - MySQL 5.7+ or MariaDB 10.3+
  - Apache web server with mod_rewrite
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Minimum 512MB RAM
- 5GB disk space for images

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install XAMPP

Download from [https://www.apachefriends.org](https://www.apachefriends.org)

### Step 2: Place Files

Copy project to:

```
C:\xampp\htdocs\showcase\          (Windows)
/Applications/XAMPP/htdocs/showcase/   (Mac)
```

### Step 3: Start Services

Open XAMPP Control Panel:

- Start **Apache**
- Start **MySQL**

### Step 4: Create Database

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Click "Import" tab
3. Choose file: `database-setup-complete.sql`
4. Click "Go"

**Done!** Database, tables, and default data created automatically.

### Step 5: Access Application

**User Dashboard:**

```
http://localhost/showcase/user/user.html
```

**Admin Panel:**

```
http://localhost/showcase/admin/admin.html
```

**Default Login:**

- Username: `admin`
- Password: `admin@123`

## 📁 Project Structure

```
showcase/
├── admin/                  # Admin panel
│   ├── admin.html         # Admin interface
│   ├── admin.js           # Admin logic (1400+ lines)
│   └── admin.css          # Admin styles
├── api/                    # Backend PHP API
│   ├── auth.php           # Authentication
│   ├── categories.php     # Category CRUD
│   ├── entries.php        # Website entry CRUD
│   ├── db.php             # Database connection
│   ├── utils.php          # Helper functions
│   ├── image_handler.php  # Image upload/delete
│   └── index.php          # API router
├── user/                   # User dashboard
│   ├── user.html          # User interface
│   ├── user.js            # User logic
│   └── user.css           # User styles
├── IMG/                    # Image storage
│   ├── default-img/       # Default placeholder
│   │   └── placeholder-img.png
│   └── temp-img/          # Temporary uploads (auto-cleanup)
├── env/                    # Configuration
│   └── config.txt         # API URL configuration
├── .htaccess              # Apache configuration
├── config.js              # Frontend config loader
├── index.html             # Entry page (redirects to user)
├── database-setup-complete.sql  # Complete database setup
├── DEPLOYMENT.md          # Production deployment guide
└── README.md              # This file
```

## 🎯 How to Use

### For Users (Public)

1. **Browse Websites**

   - View all showcased websites in card grid
   - Each card shows image, name, category, and description

2. **Search**

   - Type at least 2 characters in search bar
   - Searches in website name and description
   - Real-time filtering

3. **Filter by Category**

   - Select category from dropdown
   - View only websites in that category

4. **Visit Website**

   - Click "Visit Website" button
   - Opens in new tab

5. **Pagination**
   - 12 websites per page
   - Navigate using page numbers or arrows

### For Admins

#### Login

1. Click shield icon (bottom-right) on user dashboard
2. Or go to `admin/admin.html`
3. Enter: `admin` / `admin@123`

#### Dashboard

- View total websites count
- View total categories count
- View new websites (last 7 days)
- See distribution charts

#### Manage Websites

**View All:**

1. Go to "Web List" from sidebar
2. See all websites with search and filters
3. Search (minimum 3 characters)
4. Filter by category or date

**Add New:**

1. Go to "Add Entry"
2. Fill form:
   - Website Name (required)
   - URL (required) - auto-adds https://
   - Category (required)
   - Description (required)
   - Image (optional) - max 5MB
3. Click "Submit"
4. Form resets for next entry

**Edit:**

1. Go to "Web List"
2. Click "Edit" on any website
3. Redirects to "Add Entry" page with pre-filled data
4. Modify details (name, URL, category, description, image)
5. Click "Update Website"
6. Redirects back to "Web List" after 1 second
7. Changes saved to database

**Delete:**

1. Single: Click "Delete" button
2. Bulk: Select checkboxes, click "Delete Selected"

#### Manage Categories

**Add:**

1. Go to "Categories"
2. Enter category name
3. Click "Add"

**Edit:**

1. Click edit icon
2. Change name
3. Save
4. Updates everywhere immediately

**Delete:**

1. Click delete icon
2. Confirm
3. All websites move to "Unassigned"
4. Cannot delete "Unassigned" category

#### System Optimization

**Scan System:**

- Click "Scan System Now" to analyze
- Shows total images, attached/unattached counts
- Displays orphaned entries
- Real-time statistics

**Fix Orphaned Entries:**

- Fixes entries with invalid category_id or image_id
- Moves them to default (ID = 1)
- Click "Fix Orphaned Entries"

**View Statistics:**

- Total images (in database)
- Attached images (linked to entries)
- Unattached images (not linked)
- Total entries
- Total categories
- Orphaned entries count

## 🔧 Configuration

### Database Connection

Edit `api/db.php`:

```php
private $host = 'localhost';
private $db_name = 'atf_showcase';
private $username = 'root';
private $password = '';  // XAMPP default
```

### API URL

Edit `env/config.txt`:

```
SCRIPT_URL=http://localhost/showcase/api/
```

For production:

```
SCRIPT_URL=https://yourdomain.com/api/
```

### Change Admin Password

In phpMyAdmin:

```sql
UPDATE admin_login
SET password = 'your_new_password'
WHERE username = 'admin';
```

## 🗄️ Database Schema

### Tables

**admin_login**

- Stores admin credentials
- Default: admin / admin@123

**categories**

- Stores website categories
- ID 1 = "Unassigned" (protected)
- Tracks creation date and time

**web_entries**

- Stores website information
- Links to categories (foreign key: category_id)
- Links to images (foreign key: image_id)
- Tracks creation and modification dates
- Default category_id = 1 (Unassigned)
- Default image_id = 1 (Placeholder)

**uploaded_images**

- Stores all uploaded images
- Tracks filename, filepath, upload date
- Status: 'attached' or 'unattached'
- ID = 1 is protected placeholder
- Prevents duplicate filenames

### Relationships

- `web_entries.category_id` → `categories.id`
  - ON DELETE SET DEFAULT (1)
  - ON UPDATE CASCADE
- `web_entries.image_id` → `uploaded_images.id`
  - ON DELETE SET DEFAULT (1)
  - ON UPDATE CASCADE

### Indexes

- Date sorting: `idx_web_entries_latest`
- Category filtering: `idx_web_entries_category`
- Full-text search: `ftx_web_entries_search`

## 🔒 Security Features

- **Session-based Authentication**: Secure admin access
- **SQL Injection Prevention**: Prepared statements
- **File Upload Validation**: Type and size checks
- **CORS Configuration**: Controlled cross-origin requests
- **Protected Files**: .htaccess rules
- **Input Validation**: Frontend and backend
- **XSS Prevention**: Escaped output

## 🚀 Production Deployment

See `DEPLOYMENT.md` for complete production deployment guide.

**Quick Steps:**

1. Update `env/config.txt` with production URL
2. Update `api/db.php` with production credentials
3. Upload all files to server
4. Import `database-setup-complete.sql`
5. Set folder permissions (755 for folders, 644 for files)
6. Enable HTTPS
7. Change default admin password

## 🐛 Troubleshooting

### Database Connection Failed

- Check MySQL is running in XAMPP
- Verify credentials in `api/db.php`
- Ensure database `atf_showcase` exists

### 404 Errors on API

- Check `env/config.txt` URL matches folder name
- Verify `.htaccess` file exists
- Ensure Apache mod_rewrite is enabled

### Images Not Uploading

- Check `IMG/` folder permissions (755)
- Verify PHP upload limits (5MB)
- Check disk space

### Entry Count Mismatch

- Run optimize tool: "Remove Orphaned Entries"
- Or run SQL:

```sql
UPDATE web_entries
SET category_id = 1
WHERE category_id NOT IN (SELECT id FROM categories);
```

### Admin Login Not Working

- Clear browser cache and cookies
- Check database has admin user
- Verify session is enabled in PHP

## 📊 Performance

- **Response Time**: < 1 second
- **Concurrent Users**: 100+ (depends on server)
- **Database**: Optimized with indexes
- **Images**: Max 5MB, local storage
- **Pagination**: 12 items per page
- **Caching**: Smart cache management

## 🎨 Customization

### Change Colors

Edit CSS files:

- `admin/admin.css` - Admin panel
- `user/user.css` - User dashboard

### Modify Layout

Edit HTML files:

- `admin/admin.html` - Admin structure
- `user/user.html` - User structure

### Add Features

Edit JavaScript files:

- `admin/admin.js` - Admin functionality
- `user/user.js` - User functionality

## 📝 API Endpoints

### Authentication

- `POST /api/` - Action: `login`
- `POST /api/` - Action: `verify`
- `POST /api/` - Action: `logout`

### Categories

- `GET /api/categories.php` - Get all
- `POST /api/` - Action: `createCategory`
- `POST /api/` - Action: `updateCategory`
- `POST /api/` - Action: `deleteCategory`

### Entries

- `GET /api/entries.php` - Get all
- `POST /api/` - Action: `createWebsite`
- `POST /api/` - Action: `updateWebsite`
- `POST /api/` - Action: `deleteWebsite`
- `POST /api/` - Action: `getAdminDashboardStats`

## 💡 Tips

- Use Chrome/Firefox for best experience
- Press F12 for developer tools and debugging
- Images under 5MB load faster
- URLs auto-format with https://
- Description is required for all entries
- Bulk delete saves time for multiple entries
- Use optimize tools regularly for maintenance
- Upload images once, reuse multiple times via gallery
- Edit mode pre-fills all data automatically
- Form resets after adding, redirects after updating
- Duplicate filenames are automatically blocked
- Placeholder image (ID = 1) is protected and cannot be deleted

## 📄 License

Created by Art-Tech Fuzion

## 🙏 Credits

- **Design & Development**: Art-Tech Fuzion
- **Icons**: Font Awesome
- **Database**: MySQL
- **Server**: Apache (XAMPP)

## 📞 Support

For issues or questions:

1. Check this README
2. Review `DEPLOYMENT.md`
3. Check browser console (F12)
4. Verify database connection
5. Review error logs

## 🎉 Version

**Version**: 1.0.0  
**Release Date**: October 2025  
**Status**: Production Ready ✅

---

**Ready to showcase your websites!** 🚀

Start by accessing: `http://localhost/showcase/`
