document.addEventListener('DOMContentLoaded', async () => {
    // --- CONFIGURATION ---
    await window.config.load();
    const SCRIPT_URL = window.config.getScriptUrl();

    // --- STATE MANAGEMENT ---
    let allAdminWebsites = [];
    let categoryChart = null;
    let allCategoriesCache = [];
    let adminCurrentPage = 1;
    let filteredAdminWebsites = [];
    let adminDateFilter = null;

    // --- DOM ELEMENT SELECTORS ---
    const loadingSpinner = document.getElementById('loading-spinner');
    const pages = {
        login: document.getElementById('login-page'),
        adminPanel: document.getElementById('admin-panel')
    };
    const adminMainContent = document.getElementById('admin-main-content');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

    // --- CORE FUNCTIONS ---

    async function apiCall(action, params = {}, showFullscreenLoader = false) {
        // Check if loadingSpinner exists before trying to manipulate it
        if (showFullscreenLoader && loadingSpinner) loadingSpinner.classList.remove('hidden');

        console.log('=== API CALL DEBUG INFO ===');
        console.log('Current origin:', window.location.origin);
        console.log('SCRIPT_URL:', SCRIPT_URL);
        console.log('Action:', action);
        console.log('Params:', params);

        try {
            console.log(`Making API call to: ${SCRIPT_URL}`);
            console.log(`Action: ${action}`, params);

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({
                    action: action,
                    params: params
                })
            });

            console.log(`Response status: ${response.status}`);
            console.log(`Response headers:`, [...response.headers.entries()]);
            console.log(`Response type: ${response.type}`);
            console.log(`Response url: ${response.url}`);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            console.log(`API response:`, result);
            console.log('=== API CALL SUCCESSFUL ===');
            return result;
        } catch (error) {
            console.error('=== API CALL ERROR ===');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                action: action,
                params: params,
                scriptUrl: SCRIPT_URL,
                currentOrigin: window.location.origin
            });

            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.message.includes('Access-Control') || error.name === 'TypeError') {
                console.error('CORS ERROR DETECTED - This suggests the Google Apps Script is not configured to allow requests from:', window.location.origin);
            }

            showToast(`Error: ${error.message}`, 'error');
            return { success: false, message: error.message };
        } finally {
            if (showFullscreenLoader && loadingSpinner) loadingSpinner.classList.add('hidden');
        }
    }

    function showPage(pageName) {
        // Check if pages object exists
        if (!pages) return;
        Object.values(pages).forEach(page => {
            // Check if page exists before manipulating
            if (page) page.classList.add('hidden');
        });
        if (pages[pageName]) {
            pages[pageName].classList.remove('hidden');
        }
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        
        toast.className = `toast text-white py-3 px-4 rounded-lg shadow-lg transition-all transform translate-x-full flex items-center ${bgColor}`;
        toast.innerHTML = `
            <i class="${icon} mr-2"></i>
            <span>${message}</span>
            <button class="ml-auto text-white/80 hover:text-white" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.remove('translate-x-full'), 10);
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 5000);
    }
    
    const createContentLoader = () => `
        <div class="flex justify-center items-center p-10 h-full w-full">
            <div class="text-center">
                <div class="loader content-loader mx-auto mb-4"></div>
                <p class="text-gray-500">Loading...</p>
            </div>
        </div>
    `;

    function showConfirmationModal(message, onConfirm, title = 'Are you sure?') {
        const modal = document.getElementById('confirmation-modal');
        document.getElementById('confirmation-title').textContent = title;
        document.getElementById('confirmation-message').textContent = message;
        modal.classList.remove('hidden');

        const confirmBtn = document.getElementById('confirmation-confirm-btn');
        const cancelBtn = document.getElementById('confirmation-cancel-btn');

        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        const confirmHandler = () => {
            onConfirm();
            modal.classList.add('hidden');
        };

        const cancelHandler = () => {
            modal.classList.add('hidden');
        };

        newConfirmBtn.addEventListener('click', confirmHandler, { once: true });
        newCancelBtn.addEventListener('click', cancelHandler, { once: true });
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function resetEditModal() {
        // Clear form fields
        document.getElementById('edit-web-id').value = '';
        document.getElementById('edit-web-original-category').value = '';
        document.getElementById('edit-web-name').value = '';
        document.getElementById('edit-web-url').value = '';
        document.getElementById('edit-web-desc').value = '';
        document.getElementById('edit-web-category').value = '';
        document.getElementById('edit-web-image-base64').value = '';

        // Reset image preview
        const previewImg = document.getElementById('edit-image-preview');
        const placeholder = document.getElementById('edit-image-preview-placeholder');
        const fileInput = document.getElementById('edit-web-image');
        const errorEl = document.getElementById('edit-image-error');
        const progressEl = document.getElementById('upload-progress');

        previewImg.classList.add('hidden');
        previewImg.src = '';
        placeholder.classList.remove('hidden');
        fileInput.value = '';
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
        if (progressEl) progressEl.style.opacity = '0';

        // Hide description loader
        document.getElementById('edit-desc-loader').classList.add('hidden');

        // Clear category dropdown
        const categorySelect = document.getElementById('edit-web-category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select a category</option>';
        }
    }

    function formatUrl(url) {
        if (!url) return url;

        const trimmedUrl = url.trim();

        // If it already has http:// or https://, return as is
        if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
            return trimmedUrl;
        }

        // Check if it's a valid domain format (contains at least one dot and no spaces)
        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (domainPattern.test(trimmedUrl)) {
            // Check if it looks like a domain with TLD (has at least one dot)
            if (trimmedUrl.includes('.')) {
                return `https://${trimmedUrl}`;
            }
        }

        // For anything else, assume it's already a complete URL or return as-is
        return trimmedUrl;
    }

    // --- IMAGE HANDLING UTILITY ---
    function handleImageUpload(fileInput, previewImg, placeholder, errorEl, base64Input, removeBtn = null, progressEl = null) {
        // Handle remove button click
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                previewImg.classList.add('hidden');
                placeholder.classList.remove('hidden');
                base64Input.value = '';
                fileInput.value = '';
                // Cross button always visible now
                errorEl.classList.add('hidden');
                errorEl.textContent = '';
                if (progressEl) progressEl.style.opacity = '0';
            });
        }

        // Handle file input change
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            errorEl.classList.add('hidden');
            errorEl.textContent = '';

            if (!file) {
                previewImg.classList.add('hidden');
                placeholder.classList.remove('hidden');
                base64Input.value = '';
                // Cross button always visible now
                if (progressEl) progressEl.style.opacity = '0';
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                errorEl.textContent = 'Error: File is too large. Max size is 5MB.';
                errorEl.classList.remove('hidden');
                fileInput.value = '';
                if (progressEl) progressEl.style.opacity = '0';
                return;
            }

            // Show progress indicator
            if (progressEl) progressEl.style.opacity = '1';

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Hide progress indicator on success
                    if (progressEl) progressEl.style.opacity = '0';

                    previewImg.src = e.target.result;
                    previewImg.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                    base64Input.value = e.target.result;
                    // Cross button is always visible now
                };

                img.onerror = () => {
                    // Hide progress indicator on error
                    if (progressEl) progressEl.style.opacity = '0';
                    errorEl.textContent = 'Error: Failed to load image.';
                    errorEl.classList.remove('hidden');
                    fileInput.value = '';
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                // Hide progress indicator on error
                if (progressEl) progressEl.style.opacity = '0';
                errorEl.textContent = 'Error: Failed to read file.';
                errorEl.classList.remove('hidden');
                fileInput.value = '';
            };
            
            reader.readAsDataURL(file);
        });
    }

    // --- LOGIN & SESSION LOGIC ---
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('login-error');
        
        if (!username || !password) {
            errorElement.textContent = 'Please fill in all fields.';
            errorElement.classList.remove('hidden');
            return;
        }
        
        errorElement.classList.add('hidden');
        const result = await apiCall('login', { username, password }, true);
        
        if (result.success) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            showToast('Welcome back, Admin!', 'success');
            showPage('adminPanel');
            navigateToAdminView('dashboard');
        } else {
            errorElement.textContent = result.message || 'Invalid admin credentials.';
            errorElement.classList.remove('hidden');
        }
    });

    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        showConfirmationModal('Are you sure you want to logout?', () => {
            sessionStorage.removeItem('isAdminLoggedIn');
            document.getElementById('login-form').reset();
            document.getElementById('login-error').classList.add('hidden');
            showPage('login');
            showToast('Logged out successfully!', 'success');
        }, 'Confirm Logout');
    });

    function checkLoginStatus() {
        if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
            showPage('adminPanel');
            navigateToAdminView('dashboard');
        } else {
            showPage('login');
        }
    }

    // --- ADMIN PANEL NAVIGATION & UI ---
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToAdminView(e.currentTarget.dataset.view);
            closeMobileSidebar();
        });
    });

    const menuToggleIcon = menuToggle.querySelector('i');
    const toggleDesktopSidebar = () => {
        sidebar.classList.toggle('collapsed');
        menuToggleIcon.className = `fas text-xl ${sidebar.classList.contains('collapsed') ? 'fa-angle-double-right' : 'fa-angle-double-left'}`;
    };
    const toggleMobileSidebar = () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    };
    const closeMobileSidebar = () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    };

    menuToggle.addEventListener('click', toggleDesktopSidebar);
    mobileMenuToggle.addEventListener('click', toggleMobileSidebar);
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeMobileSidebar(); });

    async function navigateToAdminView(viewName) {
        document.querySelectorAll('.admin-nav-link').forEach(link => link.classList.remove('active'));
        document.querySelector(`.admin-nav-link[data-view="${viewName}"]`).classList.add('active');
        adminMainContent.innerHTML = createContentLoader();
        
        const viewLoaders = {
            'dashboard': loadAdminDashboardView, 
            'weblist': loadAdminWebListView,
            'addEntry': loadAdminAddEntryView, 
            'categories': loadAdminCategoriesView
        };
        await viewLoaders[viewName]();
    }

    async function refreshAdminData() {
        const refreshButton = document.getElementById('admin-refresh-fab');
        const refreshIcon = refreshButton.querySelector('i');
        const activeView = document.querySelector('.admin-nav-link.active')?.dataset.view;

        if (!activeView) {
            showToast('Could not determine the current view to refresh.', 'error');
            return;
        }

        refreshButton.disabled = true;
        refreshIcon.classList.add('fa-spin');
        showToast('Refreshing data...', 'success');

        allAdminWebsites = [];
        allCategoriesCache = [];
        adminDateFilter = null; 

        try {
            await navigateToAdminView(activeView);
            showToast('Data refreshed successfully!', 'success');
        } catch (error) {
            console.error('Error during data refresh:', error);
            showToast('Failed to refresh data.', 'error');
        } finally {
            refreshButton.disabled = false;
            refreshIcon.classList.remove('fa-spin');
        }
    }

    // --- ADMIN DASHBOARD VIEW ---
    async function loadAdminDashboardView() {
        adminMainContent.innerHTML = `
            <div class="animate-fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
                    <p class="text-gray-600">Monitor your website collection and performance metrics.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-xl card stat-card"><div class="flex items-center"><div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4"><i class="fas fa-globe text-blue-600"></i></div><div><h3 class="text-gray-500 text-sm font-medium">Total Sites</h3><p id="total-sites-stat" class="text-3xl font-bold text-gray-900"><span class="inline-block h-8 w-16 rounded-md loading-skeleton"></span></p></div></div></div>
                    <div class="bg-white p-6 rounded-xl card stat-card"><div class="flex items-center"><div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4"><i class="fas fa-plus-circle text-green-600"></i></div><div><h3 class="text-gray-500 text-sm font-medium">New Sites (7 Days)</h3><p id="new-sites-stat" class="text-3xl font-bold text-gray-900"><span class="inline-block h-8 w-12 rounded-md loading-skeleton"></span></p></div></div></div>
                    <div class="bg-white p-6 rounded-xl card stat-card"><div class="flex items-center"><div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4"><i class="fas fa-tags text-purple-600"></i></div><div><h3 class="text-gray-500 text-sm font-medium">Total Categories</h3><p id="total-categories-stat" class="text-3xl font-bold text-gray-900"><span class="inline-block h-8 w-10 rounded-md loading-skeleton"></span></p></div></div></div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white p-6 rounded-xl card">
                        <h3 class="text-xl font-semibold mb-6 flex items-center"><i class="fas fa-chart-pie text-blue-600 mr-3"></i>Website Distribution</h3>
                        <div class="chart-container flex items-center justify-center">
                            <div class="text-center text-gray-500"><div class="loader content-loader mx-auto mb-2"></div><p>Loading Chart...</p></div>
                            <canvas id="category-chart" class="hidden"></canvas>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-xl card">
                        <h3 class="text-xl font-semibold mb-6 flex items-center"><i class="fas fa-chart-bar text-green-600 mr-3"></i>Websites per Category</h3>
                        <div class="chart-container flex items-center justify-center">
                             <div class="text-center text-gray-500"><div class="loader content-loader mx-auto mb-2"></div><p>Loading Chart...</p></div>
                            <canvas id="category-count-chart" class="hidden"></canvas>
                        </div>
                    </div>
                </div>
            </div>`;
        
        const [stats, allSites] = await Promise.all([apiCall('getAdminDashboardStats'), apiCall('getAllWebsites')]);
        
        const totalSitesEl = document.getElementById('total-sites-stat');
        if (totalSitesEl) totalSitesEl.textContent = stats.totalSites ?? 0;

        const newSitesEl = document.getElementById('new-sites-stat');
        if (newSitesEl) newSitesEl.textContent = stats.newSites ?? 0;

        const totalCategoriesEl = document.getElementById('total-categories-stat');
        if (totalCategoriesEl) totalCategoriesEl.textContent = stats.totalCategories ?? 0;
        
        renderCategoryCharts(allSites);
    }
    
    function renderCategoryCharts(websites) {
        const doughnutCanvas = document.getElementById('category-chart');
        const barCanvas = document.getElementById('category-count-chart');
        if (!doughnutCanvas || !barCanvas) return;

        const doughnutContainer = doughnutCanvas.parentElement;
        const barContainer = barCanvas.parentElement;

        doughnutContainer.querySelector('div').classList.add('hidden');
        barContainer.querySelector('div').classList.add('hidden');
        
        if (window.doughnutChart) window.doughnutChart.destroy();
        if (window.barChart) window.barChart.destroy();

        if (!Array.isArray(websites) || websites.length === 0) {
            const noDataHTML = `<div class="text-center text-gray-500 py-10 w-full"><i class="fas fa-info-circle text-2xl mb-2 text-gray-400"></i><p>No data to display</p></div>`;
            doughnutContainer.innerHTML = noDataHTML;
            barContainer.innerHTML = noDataHTML;
            return;
        }

        doughnutCanvas.classList.remove('hidden');
        barCanvas.classList.remove('hidden');
        
        const categoryCounts = websites.reduce((acc, site) => {
            acc[site.category] = (acc[site.category] || 0) + 1; 
            return acc;
        }, {});

        const labels = Object.keys(categoryCounts);
        const data = Object.values(categoryCounts);
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4'];

        window.doughnutChart = new Chart(doughnutCanvas.getContext('2d'), {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        window.barChart = new Chart(barCanvas.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ label: '# of Websites', data, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 8 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    }

    // --- ADMIN WEB LIST VIEW (UPDATED) ---
    async function loadAdminWebListView() {
        adminMainContent.innerHTML = `
            <div class="animate-fade-in flex flex-col h-full">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-900">Website Management</h2>
                        <p class="text-gray-600 mt-1">Total List: <span id="total-items-count"><span class="inline-block h-5 w-10 rounded-md loading-skeleton"></span></span></p>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 admin-filters">
                    <div class="w-full sm:w-auto flex-1 max-w-md">
                        <div class="relative"><input type="text" id="search-websites" class="w-full px-4 py-3 pl-10 border rounded-lg form-input" placeholder="Search websites..."><i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i></div>
                    </div>
                    <div class="flex items-center gap-4 filter-controls">
                        <select id="admin-category-filter" class="w-full sm:w-auto px-4 py-3 border rounded-lg form-input"><option value="All">All Categories</option></select>
                        <div class="relative w-full sm:w-auto">
                            <button id="date-filter-btn" class="w-full sm:w-auto px-4 py-3 border rounded-lg form-input text-left flex justify-between items-center bg-white"><span id="date-filter-text">All Months</span> <i class="fas fa-chevron-down ml-2 text-gray-500"></i></button>
                            <div id="date-filter-popover" class="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border z-20 hidden p-4 animate-fade-in">
                                <div class="flex justify-between items-center mb-4"><button id="prev-year-btn" class="p-2 rounded-full hover:bg-gray-100 transition-colors"><i class="fas fa-chevron-left"></i></button><span id="current-year" class="font-semibold text-gray-800"></span><button id="next-year-btn" class="p-2 rounded-full hover:bg-gray-100 transition-colors"><i class="fas fa-chevron-right"></i></button></div>
                                <div id="month-grid" class="grid grid-cols-3 gap-2 mb-4"></div>
                                <div class="flex justify-end space-x-2 border-t pt-4 mt-2"><button id="cancel-date-filter" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors">Cancel</button><button id="apply-date-filter" class="px-4 py-2 text-white rounded-lg btn-primary text-sm font-medium">Filter</button></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="admin-website-list-container" class="flex-grow">
                    <div id="admin-website-list" class="grid grid-responsive gap-6">
                        <!-- Admin website cards will be injected here -->
                    </div>
                </div>
                <div id="admin-pagination" class="flex justify-center items-center mt-8 space-x-2 flex-wrap gap-2"></div>
            </div>`;
        
        const listContainer = document.getElementById('admin-website-list');
        listContainer.innerHTML = `<div class="col-span-full">${createContentLoader()}</div>`;
        
        await populateCategories('admin-category-filter');
        
        if (allAdminWebsites.length === 0) {
            const fetchedWebsites = await apiCall('getAllWebsites');
            if (Array.isArray(fetchedWebsites)) {
                allAdminWebsites = fetchedWebsites.map(site => {
                    if (site.date_added) {
                        const date = new Date(site.date_added);
                        if (!isNaN(date.getTime())) {
                            site.dateAdded = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        } else {
                            site.dateAdded = null;
                        }
                    }
                    return site;
                }).sort((a, b) => {
                    const dateA = a.date_added ? new Date(a.date_added) : new Date(0);
                    const dateB = b.date_added ? new Date(b.date_added) : new Date(0);
                    return dateB - dateA;
                });
            }
        }
        
        filteredAdminWebsites = allAdminWebsites;
        document.getElementById('search-websites').addEventListener('keyup', debounce(filterAdminWebList, 300));
        document.getElementById('admin-category-filter').addEventListener('change', filterAdminWebList);
        listContainer.addEventListener('click', handleWebListActions);
        setupDateFilter();
        renderAdminWebListPage(1);
    }

    function setupDateFilter() {
        const dateFilterBtn = document.getElementById('date-filter-btn');
        const popover = document.getElementById('date-filter-popover');
        let displayedYear = new Date().getFullYear();
        let selectedMonth = null;

        const renderMonthPicker = (year) => {
            document.getElementById('current-year').textContent = year;
            const monthGrid = document.getElementById('month-grid');
            monthGrid.innerHTML = '';
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            months.forEach((month, index) => {
                const btn = document.createElement('button');
                btn.textContent = month;
                btn.className = 'month-btn p-2 rounded-lg text-sm hover:bg-gray-100';
                if (selectedMonth === index + 1 && displayedYear === (adminDateFilter ? parseInt(adminDateFilter.split('-')[0]) : null)) {
                    btn.classList.add('selected');
                }
                btn.onclick = () => {
                    selectedMonth = selectedMonth === index + 1 ? null : index + 1;
                    document.querySelectorAll('#month-grid .month-btn').forEach((b, i) => {
                        b.classList.toggle('selected', selectedMonth === i + 1);
                    });
                };
                monthGrid.appendChild(btn);
            });
        };

        dateFilterBtn.onclick = (e) => {
            e.stopPropagation();
            popover.classList.toggle('hidden');
            if (!popover.classList.contains('hidden')) {
                displayedYear = adminDateFilter ? parseInt(adminDateFilter.split('-')[0]) : new Date().getFullYear();
                selectedMonth = adminDateFilter ? parseInt(adminDateFilter.split('-')[1]) : null;
                renderMonthPicker(displayedYear);
            }
        };

        document.getElementById('prev-year-btn').onclick = () => renderMonthPicker(--displayedYear);
        document.getElementById('next-year-btn').onclick = () => renderMonthPicker(++displayedYear);
        document.getElementById('cancel-date-filter').onclick = () => {
            popover.classList.add('hidden');
            adminDateFilter = null;
            document.getElementById('date-filter-text').textContent = 'All Months';
            filterAdminWebList();
        };
        document.getElementById('apply-date-filter').onclick = () => {
            adminDateFilter = selectedMonth ? `${displayedYear}-${String(selectedMonth).padStart(2, '0')}` : null;
            document.getElementById('date-filter-text').textContent = adminDateFilter ? `${new Date(displayedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${displayedYear}` : 'All Months';
            popover.classList.add('hidden');
            filterAdminWebList();
        };
        document.addEventListener('click', (e) => {
            if (popover && !dateFilterBtn.contains(e.target) && !popover.contains(e.target)) popover.classList.add('hidden');
        });
    }

    function renderAdminWebListPage(page) {
        adminCurrentPage = page;
        const limit = 9; // Adjusted for grid layout
        const totalPages = Math.ceil(filteredAdminWebsites.length / limit);
        const paginatedItems = filteredAdminWebsites.slice((page - 1) * limit, page * limit);
        document.getElementById('total-items-count').textContent = filteredAdminWebsites.length;
        renderAdminWebList(paginatedItems);
        renderAdminPaginationControls(totalPages);
    }

    function renderAdminWebList(websites) {
        const listContainer = document.getElementById('admin-website-list');
        if (!listContainer) return;
    
        if (!websites || websites.length === 0) {
            listContainer.innerHTML = `<div class="col-span-full text-center py-12 no-web-found"><p>No websites found matching your criteria.</p></div>`;
            return;
        }
    
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
    
        websites.forEach((site, index) => {
            const card = document.createElement('div');
            card.className = "bg-white rounded-xl p-0 flex flex-col card animate-slide-in-up overflow-hidden";
            card.style.animationDelay = `${index * 0.05}s`;
            card.dataset.id = site.id;
            card.dataset.category = site.category;
    
            const imageHtml = site.image ?
                `<img src="${site.image}" alt="${site.name}" class="w-full h-48 object-cover object-position-top-center" loading="lazy">` :
                `<div class="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                    <i class="fas fa-image text-4xl"></i>
                </div>`;
    
            card.innerHTML = `
                ${imageHtml}
                <div class="p-6 flex flex-col flex-grow">
                    <div class="flex items-start justify-between mb-3">
                        <h3 class="text-lg font-bold text-gray-900 truncate pr-2">${site.name}</h3>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">${site.category}</span>
                    </div>
                    <p class="text-gray-600 text-sm flex-grow mb-4 website-description">${site.description}</p>
                    <div class="flex justify-end space-x-2 mt-auto border-t pt-4 -mx-6 px-6 pb-1">
                        <button class="edit-btn px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg flex items-center transition-colors"><i class="fas fa-edit mr-2"></i>Edit</button>
                        <button class="delete-btn px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center transition-colors"><i class="fas fa-trash mr-2"></i>Delete</button>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });
        
        // Clear and update container in one operation
        listContainer.innerHTML = '';
        listContainer.appendChild(fragment);
    }

    function renderAdminPaginationControls(totalPages) {
        const paginationContainer = document.getElementById('admin-pagination');
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;
        const createButton = (content, page) => {
            const button = document.createElement('button');
            button.innerHTML = content;
            button.className = `pagination-btn ${adminCurrentPage === page ? 'active' : 'bg-white text-gray-700 hover:bg-gray-50 border'}`;
            button.onclick = () => renderAdminWebListPage(page);
            return button;
        };
        if (adminCurrentPage > 1) paginationContainer.appendChild(createButton('<i class="fas fa-chevron-left"></i>', adminCurrentPage - 1));
        for (let i = Math.max(1, adminCurrentPage - 2); i <= Math.min(totalPages, adminCurrentPage + 2); i++) {
            paginationContainer.appendChild(createButton(i, i));
        }
        if (adminCurrentPage < totalPages) paginationContainer.appendChild(createButton('<i class="fas fa-chevron-right"></i>', adminCurrentPage + 1));
    }

    async function handleWebListActions(e) {
        const card = e.target.closest('.card');
        if (!card) return;
        const id = card.dataset.id;
        const category = card.dataset.category;
        
        if (e.target.closest('.edit-btn')) {
            const siteData = allAdminWebsites.find(s => s.id == id && s.category === category);
            if (!siteData) return;

            // Reset modal state before opening
            resetEditModal();

            document.getElementById('edit-modal').classList.remove('hidden');
            document.getElementById('edit-web-id').value = id;
            document.getElementById('edit-web-original-category').value = category;
            document.getElementById('edit-web-name').value = siteData.name;
            document.getElementById('edit-web-url').value = siteData.url;
            document.getElementById('edit-desc-loader').classList.remove('hidden');

            const previewImg = document.getElementById('edit-image-preview');
            const placeholder = document.getElementById('edit-image-preview-placeholder');
            const base64Input = document.getElementById('edit-web-image-base64');
            const fileInput = document.getElementById('edit-web-image');
            const errorEl = document.getElementById('edit-image-error');
            fileInput.value = '';
            errorEl.classList.add('hidden');
            
            if (siteData.image) {
                previewImg.src = siteData.image;
                previewImg.classList.remove('hidden');
                placeholder.classList.add('hidden');
                base64Input.value = siteData.image;
            } else {
                previewImg.classList.add('hidden');
                placeholder.classList.remove('hidden');
                base64Input.value = '';
            }
            
            const [descResult] = await Promise.all([
                apiCall('getWebsiteDetails', { id, category }),
                populateCategories('edit-web-category', category)
            ]);
            document.getElementById('edit-web-desc').value = descResult.success ? descResult.description : siteData.description;
            document.getElementById('edit-desc-loader').classList.add('hidden');
        }
        
        if (e.target.closest('.delete-btn')) {
            const siteData = allAdminWebsites.find(s => s.id == id && s.category === category);
            if (!siteData) return;
            
            showConfirmationModal(`Delete "${siteData.name}"?`, async () => {
                const result = await apiCall('deleteWebsite', { id, category }, true);
                if (result.success) {
                    showToast('Website deleted!');
                    allAdminWebsites = allAdminWebsites.filter(s => !(s.id == id && s.category === category));
                    filterAdminWebList();
                }
            });
        }
    }
    
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        resetEditModal();
        document.getElementById('edit-modal').classList.add('hidden');
    });

    document.getElementById('edit-entry-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.querySelector('#edit-modal button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
        submitBtn.disabled = true;
        
        const urlInput = document.getElementById('edit-web-url').value.trim();
        const formattedUrl = formatUrl(urlInput);
        
        const imageBase64Value = document.getElementById('edit-web-image-base64').value;
        const entry = {
            id: document.getElementById('edit-web-id').value,
            originalCategory: document.getElementById('edit-web-original-category').value,
            name: document.getElementById('edit-web-name').value.trim(),
            description: document.getElementById('edit-web-desc').value.trim(),
            url: formattedUrl,
            newCategory: document.getElementById('edit-web-category').value,
            imageBase64: imageBase64Value || undefined
        };
        
        try {
            const result = await apiCall('updateWebsite', { entry });
            if (result.success) {
                showToast('Website updated!');
                resetEditModal();
                document.getElementById('edit-modal').classList.add('hidden');
                // Clear cache and refresh data
                allAdminWebsites = [];
                filteredAdminWebsites = [];
                adminDateFilter = null;
                // Force complete data refresh
                await loadAdminWebListView();
            }
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
    
    const filterAdminWebList = () => {
        const searchTerm = document.getElementById('search-websites')?.value?.toLowerCase() || '';
        const categoryFilter = document.getElementById('admin-category-filter')?.value || 'All';
        
        filteredAdminWebsites = allAdminWebsites.filter(site => {
            const matchesSearch = site.name.toLowerCase().includes(searchTerm) || 
                                  site.description.toLowerCase().includes(searchTerm) ||
                                  site.url.toLowerCase().includes(searchTerm);
            const matchesCategory = categoryFilter === 'All' || site.category === categoryFilter;
            const matchesDate = !adminDateFilter || (site.dateAdded && site.dateAdded === adminDateFilter);
            return matchesSearch && matchesCategory && matchesDate;
        });
        renderAdminWebListPage(1);
    };
    
    // --- ADMIN ADD ENTRY VIEW ---
    async function loadAdminAddEntryView() {
        adminMainContent.innerHTML = `
            <div class="animate-fade-in">
                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-plus text-white text-2xl"></i>
                    </div>
                    <h2 class="text-3xl font-bold text-gray-900">Add New Website</h2>
                    <p class="text-gray-600 mt-2">Fill in the details below to add a new website to your collection.</p>
                </div>
                <div class="bg-white rounded-xl shadow-lg max-w-3xl mx-auto card">
                    <div class="p-8">
                        <form id="add-entry-form">
                            <input type="hidden" id="new-web-image-base64">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="new-web-name" class="block text-sm font-medium text-gray-700 mb-2">Website Name <span class="text-red-500">*</span></label>
                                    <input type="text" id="new-web-name" class="block w-full px-4 py-3 border rounded-lg form-input" required placeholder="e.g. Awesome Design Co.">
                                </div>
                                <div>
                                    <label for="new-web-category" class="block text-sm font-medium text-gray-700 mb-2">Category <span class="text-red-500">*</span></label>
                                    <select id="new-web-category" class="block w-full px-4 py-3 border rounded-lg form-input" required><option value="">Select a category</option></select>
                                </div>
                            </div>
                            <div class="mt-6">
                                <label for="new-web-url" class="block text-sm font-medium text-gray-700 mb-2">Website URL <span class="text-red-500">*</span></label>
                                <input type="text" id="new-web-url" class="block w-full px-4 py-3 border rounded-lg form-input" placeholder="https://example.com or example.com" required>
                            </div>
                            <div class="mt-6">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Website Image</label>
                                <div class="flex items-start gap-4">
                                    <div class="image-preview-container">
                                        <div id="new-image-preview-placeholder" class="image-preview-placeholder">
                                            <i class="fas fa-upload"></i>
                                            <p>Upload Image</p>
                                        </div>
                                        <img id="new-image-preview" src="" alt="Image Preview" class="hidden"/>
                                    </div>
                                    <div class="flex-1">
                                         <input type="file" id="new-web-image" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept="image/*">
                                         <p class="text-xs text-gray-500 mt-2">Optional. Max 5MB.</p>
                                         <p id="new-image-error" class="error-text hidden"></p>
                                    </div>
                                </div>
                            </div>
                            <div class="mt-6">
                                <label for="new-web-desc" class="block text-sm font-medium text-gray-700 mb-2">Description <span class="text-red-500">*</span></label>
                                <textarea id="new-web-desc" rows="5" class="block w-full px-4 py-3 border rounded-lg form-input resize-none" required placeholder="A brief description..."></textarea>
                            </div>
                            <div class="mt-8 flex justify-end space-x-4 flex-responsive gap-responsive">
                                <button type="button" onclick="navigateToAdminView('weblist')" class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
                                <button type="submit" class="px-8 py-3 text-white rounded-lg btn-primary font-medium form-submit-btn"><i class="fas fa-plus mr-2"></i>Add Website</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;
        
        await populateCategories('new-web-category');

        handleImageUpload(
            document.getElementById('new-web-image'),
            document.getElementById('new-image-preview'),
            document.getElementById('new-image-preview-placeholder'),
            document.getElementById('new-image-error'),
            document.getElementById('new-web-image-base64')
        );
        
        document.getElementById('add-entry-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            submitBtn.disabled = true;
            
            const urlInput = document.getElementById('new-web-url').value.trim();
            const formattedUrl = formatUrl(urlInput);
            
            const entry = {
                name: document.getElementById('new-web-name').value.trim(),
                description: document.getElementById('new-web-desc').value.trim(),
                url: formattedUrl,
                category: document.getElementById('new-web-category').value,
                imageBase64: document.getElementById('new-web-image-base64').value
            };
            
            try {
                const result = await apiCall('addWebsite', { entry });
                if (result.success) {
                    showToast('Website added!');
                    allAdminWebsites = [];
                    navigateToAdminView('weblist');
                }
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // --- ADMIN CATEGORIES VIEW ---
    async function loadAdminCategoriesView() {
        adminMainContent.innerHTML = `
            <div class="animate-fade-in">
                <div class="mb-8">
                    <h2 class="text-3xl font-bold text-gray-900 mb-2">Category Management</h2>
                    <p class="text-gray-600">Organize your websites by creating and managing categories.</p>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="bg-white rounded-xl shadow-lg card">
                        <div class="p-6 border-b border-gray-200"><h3 class="text-xl font-semibold text-gray-900 flex items-center"><i class="fas fa-list text-blue-600 mr-3"></i>Existing Categories</h3></div>
                        <div class="p-6"><div id="existing-categories-list" class="space-y-3 max-h-96 overflow-y-auto"></div></div>
                    </div>
                    <div class="bg-white rounded-xl shadow-lg card">
                        <div class="p-6 border-b border-gray-200"><h3 class="text-xl font-semibold text-gray-900 flex items-center"><i class="fas fa-plus text-green-600 mr-3"></i>Add New Category</h3></div>
                        <div class="p-6">
                            <form id="add-category-form">
                                <label for="new-category-name" class="block text-sm font-medium text-gray-700 mb-2">Category Name <span class="text-red-500">*</span></label>
                                <div class="flex space-x-3 add-category-form-input-cont">
                                    <input type="text" id="new-category-name" class="flex-1 px-4 py-3 border rounded-lg form-input" required placeholder="Enter category name">
                                    <button type="submit" class="px-6 py-3 text-white rounded-lg btn-primary font-medium form-submit-btn"><i class="fas fa-plus mr-2"></i>Add</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.getElementById('add-category-form').addEventListener('submit', handleAddCategory);
        document.getElementById('existing-categories-list').addEventListener('click', handleCategoryActions);
        
        await renderExistingCategories();
    }

    async function renderExistingCategories() {
        const listContainer = document.getElementById('existing-categories-list');
        listContainer.innerHTML = createContentLoader();
        const categories = await getCategories();
        
        if (categories && categories.length > 0) {
            listContainer.innerHTML = categories.map((cat, i) => `
                <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors animate-slide-in-right" style="animation-delay:${i*0.1}s">
                    <div class="flex items-center"><div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3"><i class="fas fa-tag text-blue-600 text-sm"></i></div><span class="font-medium text-gray-900">${cat}</span></div>
                    <div><button class="edit-category-btn p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg" data-category="${cat}"><i class="fas fa-edit"></i></button><button class="delete-category-btn p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg" data-category="${cat}"><i class="fas fa-trash"></i></button></div>
                </div>`).join('');
        } else {
            listContainer.innerHTML = `<div class="text-center py-8 text-gray-500">No categories found.</div>`;
        }
    }
    
    async function handleAddCategory(e) {
        e.preventDefault();
        const input = document.getElementById('new-category-name');
        const categoryName = input.value.trim();
        if (!categoryName) return;
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding...';
        submitBtn.disabled = true;

        try {
            const result = await apiCall('addCategory', { categoryName });
            if (result.success) {
                showToast('Category added!');
                input.value = '';
                allCategoriesCache = [];
                await renderExistingCategories();
            }
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async function handleCategoryActions(e) {
        const button = e.target.closest('button');
        if (!button) return;
        const categoryName = button.dataset.category;

        if (button.classList.contains('edit-category-btn')) {
            document.getElementById('edit-category-modal').classList.remove('hidden');
            document.getElementById('edit-category-old-name').value = categoryName;
            document.getElementById('edit-category-new-name').value = categoryName;
        }
        
        if (button.classList.contains('delete-category-btn')) {
            showConfirmationModal(`Delete "${categoryName}" category? This will also delete all websites in it.`, async () => {
                const result = await apiCall('deleteCategory', { categoryName }, true);
                if (result.success) {
                    showToast('Category deleted!');
                    allCategoriesCache = [];
                    await renderExistingCategories();
                }
            });
        }
    }
    
    document.getElementById('cancel-edit-category-btn').addEventListener('click', () => document.getElementById('edit-category-modal').classList.add('hidden'));
    
    document.getElementById('edit-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldName = document.getElementById('edit-category-old-name').value;
        const newName = document.getElementById('edit-category-new-name').value.trim();
        if (!newName || oldName === newName) {
            document.getElementById('edit-category-modal').classList.add('hidden');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
        submitBtn.disabled = true;
        
        try {
            const result = await apiCall('editCategory', { oldName, newName });
            if (result.success) {
                showToast('Category updated!');
                document.getElementById('edit-category-modal').classList.add('hidden');
                
                const index = allCategoriesCache.indexOf(oldName);
                if (index > -1) {
                    allCategoriesCache.splice(index, 1);
                }
                allCategoriesCache.unshift(newName);

                await renderExistingCategories();
            }
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // --- UTILITY FUNCTIONS ---
    async function getCategories() {
        if (allCategoriesCache.length === 0) {
            const result = await apiCall('getCategories');
            
            if (Array.isArray(result) && result.length > 0 && result[0].date && result[0].time && result[0].name) {
                try {
                    result.sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));
                    allCategoriesCache = result.map(categoryObject => categoryObject.name);
                } catch (error) {
                    console.error("Failed to sort categories by date. Using default order.", error);
                    allCategoriesCache = Array.isArray(result) ? result.map(r => r.name || r).reverse() : [];
                }
            } else if (Array.isArray(result)) {
                allCategoriesCache = result.reverse();
            } else {
                allCategoriesCache = [];
            }
        }
        return allCategoriesCache;
    }

    async function populateCategories(selectElementId, selectedValue = null) {
        const select = document.getElementById(selectElementId);
        if (!select) return;
        
        const categories = await getCategories();
        let firstOption = select.querySelector('option');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            if (cat === selectedValue) option.selected = true;
            select.appendChild(option);
        });
    }

    // --- INITIALIZATION ---
    document.getElementById('admin-refresh-fab').addEventListener('click', refreshAdminData);

    handleImageUpload(
        document.getElementById('edit-web-image'),
        document.getElementById('edit-image-preview'),
        document.getElementById('edit-image-preview-placeholder'),
        document.getElementById('edit-image-error'),
        document.getElementById('edit-web-image-base64'),
        document.getElementById('remove-image-btn'),
        document.getElementById('upload-progress')
    );

    checkLoginStatus();
    window.navigateToAdminView = navigateToAdminView;
});
