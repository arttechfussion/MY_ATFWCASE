document.addEventListener('DOMContentLoaded', async () => {
    // --- CONFIGURATION ---
    await window.config.load();
    const SCRIPT_URL = window.config.getScriptUrl();

    // --- STATE MANAGEMENT ---
    let userCurrentPage = 1;
    let allUserWebsites = [];
    let filteredUserWebsites = [];
    let allCategoriesCache = [];

    // --- CORE API FUNCTION ---
    async function apiCall(action, params = {}) {
        try {
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Call Error:', error);
            showError(`Failed to fetch data: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    // --- UTILITY FUNCTIONS ---
    function showError(message) {
        const websiteList = document.getElementById('website-list');
        websiteList.innerHTML = `
            <div class="col-span-full">
                <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-circle text-red-400"></i>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium">Error Loading Data</h3>
                            <div class="mt-2 text-sm">${message}</div>
                            <div class="mt-4">
                                <button type="button" onclick="window.location.reload()" 
                                        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200">
                                    <i class="fas fa-sync-alt mr-2"></i> Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    const createContentLoader = () => `
        <div class="flex justify-center items-center p-10 h-full w-full">
            <div class="text-center">
                <div class="loader content-loader mx-auto mb-4"></div>
                <p class="text-gray-500">Loading...</p>
            </div>
        </div>
    `;

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

    // --- USER DASHBOARD LOGIC ---
    async function loadUserDashboard() {
        const websiteList = document.getElementById('website-list');
        websiteList.innerHTML = `<div class="col-span-full">${createContentLoader()}</div>`;
        
        try {
            await populateCategories('user-category-filter');
            const result = await apiCall('getAllWebsites');
            
            if (result && Array.isArray(result)) {
                allUserWebsites = result.sort((a, b) => {
                    // Combine date and time for accurate sorting
                    const dateTimeA = a.date_added && a.time_added 
                        ? new Date(a.date_added + ' ' + a.time_added) 
                        : new Date(0);
                    const dateTimeB = b.date_added && b.time_added 
                        ? new Date(b.date_added + ' ' + b.time_added) 
                        : new Date(0);
                    return dateTimeB - dateTimeA;
                });
                renderUserView(1);
            } else {
                showError('Failed to load websites. Please try again later.');
            }
        } catch (error) {
            showError('Failed to load dashboard. Please try again later.');
        }
    }

    function renderUserView(page = 1) {
        userCurrentPage = page;
        const category = document.getElementById('user-category-filter').value;
        const searchTerm = document.getElementById('user-search-bar').value.toLowerCase();
        const websiteList = document.getElementById('website-list');

        filteredUserWebsites = allUserWebsites.filter(site => {
            const matchesCategory = category === 'All' || site.category === category;
            const matchesSearch = !searchTerm || site.name.toLowerCase().includes(searchTerm) || site.description.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        const limit = 12;
        const totalPages = Math.ceil(filteredUserWebsites.length / limit);
        const paginatedItems = filteredUserWebsites.slice((page - 1) * limit, page * limit);
        
        if (paginatedItems.length > 0) {
            const fragment = document.createDocumentFragment();
            
            paginatedItems.forEach((site, index) => {
                const card = document.createElement('div');
                card.className = "bg-white rounded-xl p-0 flex flex-col card animate-slide-in-up overflow-hidden";
                card.style.animationDelay = `${index * 0.05}s`;

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
                        <a href="${site.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors mt-auto">
                            <i class="fas fa-external-link-alt mr-2"></i>Visit Website
                        </a>
                    </div>
                `;
                fragment.appendChild(card);
            });
            
            websiteList.innerHTML = '';
            websiteList.appendChild(fragment);
        } else {
            websiteList.innerHTML = `<div class="col-span-full text-center py-12 no-web-found"><p>No websites found matching your criteria.</p></div>`;
        }
        renderUserPagination(totalPages);
    }

    function renderUserPagination(totalPages) {
        const paginationContainer = document.getElementById('user-pagination');
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const createButton = (content, page) => {
            const button = document.createElement('button');
            button.innerHTML = content;
            button.className = `pagination-btn ${userCurrentPage === page ? 'active' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`;
            button.addEventListener('click', () => {
                renderUserView(page);
                document.getElementById('website-list-container').scrollIntoView({ behavior: 'smooth' });
            });
            return button;
        };

        if (userCurrentPage > 1) paginationContainer.appendChild(createButton('<i class="fas fa-chevron-left"></i>', userCurrentPage - 1));
        
        let startPage = Math.max(1, userCurrentPage - 2);
        let endPage = Math.min(totalPages, userCurrentPage + 2);

        if (userCurrentPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        if (userCurrentPage > totalPages - 3) {
            startPage = Math.max(1, totalPages - 4);
        }

        if (startPage > 1) {
            paginationContainer.appendChild(createButton(1, 1));
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'px-2 text-gray-500';
                paginationContainer.appendChild(dots);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createButton(i, i));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.className = 'px-2 text-gray-500';
                paginationContainer.appendChild(dots);
            }
            paginationContainer.appendChild(createButton(totalPages, totalPages));
        }

        if (userCurrentPage < totalPages) paginationContainer.appendChild(createButton('<i class="fas fa-chevron-right"></i>', userCurrentPage + 1));
    }
    
    // --- EVENT LISTENERS ---
    document.getElementById('user-category-filter').addEventListener('change', () => renderUserView(1));
    document.getElementById('user-search-bar').addEventListener('keyup', debounce(() => renderUserView(1), 300));

    // --- INITIALIZATION ---
    loadUserDashboard();
});
