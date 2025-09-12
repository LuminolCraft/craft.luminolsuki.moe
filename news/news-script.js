document.addEventListener('DOMContentLoaded', function() {
    // 初始化汉堡菜单功能
    function initHamburgerMenu() {
        const menuButton = document.querySelector('.menu-button');
        const navLinks = document.querySelector('.nav-links');
        
        if (menuButton && navLinks) {
            menuButton.addEventListener('click', function() {
                navLinks.classList.toggle('responsive');
                
                const icon = menuButton.querySelector('i');
                if (navLinks.classList.contains('responsive')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
            
            const navItems = navLinks.querySelectorAll('a');
            navItems.forEach(item => {
                item.addEventListener('click', function() {
                    if (navLinks.classList.contains('responsive')) {
                        navLinks.classList.remove('responsive');
                        
                        const icon = menuButton.querySelector('i');
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                });
            });
        }
    }
    
    initHamburgerMenu();

    // 初始化下拉菜单
    function initDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown');
        

        
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            dropdown.addEventListener('mouseenter', function() {
                if (window.innerWidth >= 768) {
                    menu.style.display = 'block';
                    setTimeout(() => {
                        menu.style.opacity = '1';
                        menu.style.transform = 'translateY(0)';
                    }, 10);
                }
            });
            
            dropdown.addEventListener('mouseleave', function() {
                if (window.innerWidth >= 768) {
                    menu.style.opacity = '0';
                    menu.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        menu.style.display = 'none';
                    }, 300);
                }
            });
            
            toggle.addEventListener('click', function(e) {
                if (window.innerWidth < 768) {
                    e.preventDefault();
                    
                    document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
                        if (otherMenu !== menu) {
                            otherMenu.style.display = 'none';
                        }
                    });
                    
                    if (menu.style.display === 'block') {
                        menu.style.opacity = '0';
                        menu.style.transform = 'translateY(10px)';
                        setTimeout(() => {
                            menu.style.display = 'none';
                        }, 300);
                    } else {
                        menu.style.display = 'block';
                        setTimeout(() => {
                            menu.style.opacity = '1';
                            menu.style.transform = 'translateY(0)';
                        }, 10);
                    }
                }
            });
        });
        
        window.addEventListener('resize', function() {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.display = '';
                menu.style.opacity = '';
                menu.style.transform = '';
            });
        });
    }






    initDropdowns();

    const newsGrid = document.querySelector('#news-grid');
    const paginationContainer = document.querySelector('#news-pagination');
    const searchInput = document.querySelector('#news-search-input');
    const searchBtn = document.querySelector('#news-search-btn');
    const tagSelect = document.querySelector('#tag-select');
    let currentPage = 0;
    const itemsPerPage = 6;
    let filteredNews = null;
    const CACHE_DURATION = 30 * 60 * 1000;

    // 安全的HTML编码函数
    function encodeHTML(str) {
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    // 验证新闻数据
    function validateNewsItem(item) {
        const requiredFields = ['id', 'title', 'date', 'content', 'image'];
        for (const field of requiredFields) {
            if (!item.hasOwnProperty(field)) {
                console.error(`新闻项缺少必需字段: ${field}`);
                return false;
            }
        }
        
        // 验证ID是数字
        if (typeof item.id !== 'number') {
            console.error('新闻ID必须是数字');
            return false;
        }
        
        // 验证图片URL格式
        if (!item.image.startsWith('https://')) {
            console.error('图片URL必须以https开头');
            return false;
        }
        
        return true;
    }

    // 动态生成标签选项
    function populateTagFilter(newsItems) {
        const tags = new Set();
        newsItems.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => tags.add(encodeHTML(tag)));
            }
        });
        
        tagSelect.innerHTML = '<option value="">所有标签</option>';
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagSelect.appendChild(option);
        });
    }

    // 安全的创建DOM元素
    function createDOMElement(tag, attributes = {}, textContent = '') {
        const element = document.createElement(tag);
        
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'style' && typeof value === 'object') {
                for (const [cssProp, cssValue] of Object.entries(value)) {
                    element.style[cssProp] = cssValue;
                }
            } else {
                element.setAttribute(key, value);
            }
        }
        
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }



    // 动态生成标签选项
    function populateTagFilter(newsItems) {
        const tags = new Set();
        newsItems.forEach(item => {
            item.tags?.forEach(tag => tags.add(tag));
        });
        tagSelect.innerHTML = '<option value="">所有标签</option>';
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagSelect.appendChild(option);
        });
    }

    // 渲染新闻项
    function renderNewsItems(items, isNonPinned = false) {
        items.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = `news-item ${item.pinned ? 'pinned' : ''}`;
            newsItem.dataset.newsId = item.id;

            const newsImg = document.createElement('div');
            newsImg.className = 'news-img';
            newsImg.style.backgroundImage = `url('${encodeHTML(item.image)}')`;

            const newsContent = document.createElement('div');
            newsContent.className = 'news-content';

            const pinnedIcon = item.pinned ? '<span class="pinned-icon">📌</span>' : '';
            newsContent.innerHTML = `
                ${pinnedIcon}
                <h3>${encodeHTML(item.title)}</h3>
                <span class="news-date">${encodeHTML(item.date)}</span>
                <div class="news-tags">
                    ${item.tags?.map(tag => `<span class="tag">${encodeHTML(tag)}</span>`).join('') || ''}
                </div>
                <p>${marked.parse(item.content)}</p>  
            `;

            const link = document.createElement('a');
            link.href = '#';
            link.className = 'news-btn';
            link.textContent = '阅读更多';

            newsItem.appendChild(newsImg);
            newsItem.appendChild(newsContent);
            newsItem.appendChild(link);

            newsGrid.appendChild(newsItem);
        });
    }

    // 渲染分页导航
    function renderPagination(totalNonPinnedItems, totalPages) {
        paginationContainer.innerHTML = '';
        if (totalNonPinnedItems === 0 && !filteredNews?.some(item => item.pinned)) {
            return;
        }

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '上一页';
        prevBtn.className = 'pagination-btn' + (currentPage === 0 ? ' disabled' : '');
        prevBtn.disabled = currentPage === 0;
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 0) {
                currentPage--;
                loadNews();
            }
        });
        paginationContainer.appendChild(prevBtn);

        const maxVisiblePages = 5;
        let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
        startPage = Math.max(0, endPage - maxVisiblePages + 1);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i + 1;
            pageBtn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
            pageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                loadNews();
            });
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '下一页';
        nextBtn.className = 'pagination-btn' + (currentPage === totalPages - 1 ? ' disabled' : '');
        nextBtn.disabled = currentPage === totalPages - 1;
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages - 1) {
                currentPage++;
                loadNews();
            }
        });
        paginationContainer.appendChild(nextBtn);
    }

    // 检查缓存是否有效
    function isCacheValid() {
        const timestamp = localStorage.getItem('news-cache-timestamp');
        if (!timestamp) return false;
        const currentTime = new Date().getTime();
        return (currentTime - parseInt(timestamp)) < CACHE_DURATION;
    }

    // 加载新闻
    function loadNews() {
        const existingError = newsGrid.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const dataToUse = filteredNews || JSON.parse(localStorage.getItem('news-cache') || '[]');
        
        if (dataToUse.length === 0) {
            newsGrid.innerHTML = '<p class="empty-message">暂无新闻</p>';
            paginationContainer.innerHTML = '';
            return;
        }

        // 分离置顶和非置顶新闻
        const pinnedItems = dataToUse.filter(item => item.pinned);
        const nonPinnedItems = dataToUse.filter(item => !item.pinned);
        const totalNonPinnedItems = nonPinnedItems.length;
        const totalPages = Math.ceil(totalNonPinnedItems / itemsPerPage);

        // 计算当前页的非置顶新闻
        const start = currentPage * itemsPerPage;
        const nonPinnedToShow = nonPinnedItems.slice(start, start + itemsPerPage);

        // 渲染置顶新闻（始终显示在顶部）
        newsGrid.innerHTML = '';
        renderNewsItems(pinnedItems);
        // 渲染当前页的非置顶新闻
        renderNewsItems(nonPinnedToShow, true);
        // 渲染分页（仅针对非置顶新闻）
        renderPagination(totalNonPinnedItems, totalPages);
    }

    // 搜索和标签筛选
    function filterNews() {
        const query = searchInput.value.trim().toLowerCase();
        const selectedTag = tagSelect.value;
        const cachedNews = JSON.parse(localStorage.getItem('news-cache') || '[]');
        
        currentPage = 0;
        newsGrid.innerHTML = '';

        if (query === '' && selectedTag === '') {
            filteredNews = null;
            loadNews();
            return;
        }

        filteredNews = cachedNews.filter(item => {
            const matchesSearch = query === '' || 
                item.title.toLowerCase().includes(query) || 
                item.content.toLowerCase().includes(query);
            const matchesTag = selectedTag === '' || 
                (item.tags && item.tags.includes(selectedTag));
            return matchesSearch && matchesTag;
        });

        if (filteredNews.length === 0) {
            newsGrid.innerHTML = '<p class="empty-message">暂无匹配的新闻</p>';
            paginationContainer.innerHTML = '';
            return;
        }

        loadNews();
    }

    // 初始化加载
    function initNews() {
        if (isCacheValid()) {
            const cachedNews = JSON.parse(localStorage.getItem('news-cache') || '[]');
            populateTagFilter(cachedNews);
            loadNews();
            return;
        }

        fetch('https://raw.githubusercontent.com/LuminolCraft/news.json/refs/heads/main/news.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('无法加载新闻数据');
                }
                return response.json();
            })
            .then(data => {
                localStorage.setItem('news-cache', JSON.stringify(data));
                localStorage.setItem('news-cache-timestamp', new Date().getTime().toString());
                populateTagFilter(data);
                loadNews();
            })
            .catch(error => {
                console.error('加载新闻失败:', error);
                newsGrid.innerHTML = '<p class="error-message">加载新闻失败，请稍后重试</p>';
                paginationContainer.innerHTML = '';
            });
    }

    // 初始化加载
    initNews();

    // 搜索和标签筛选事件
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            filterNews();
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                filterNews();
            }
        });
    }

    if (tagSelect) {
        tagSelect.addEventListener('change', (e) => {
            filterNews();
        });
    }

    // 点击新闻卡片跳转
    newsGrid.addEventListener('click', (e) => {
        const newsItem = e.target.closest('.news-item');
        if (newsItem && e.target.classList.contains('news-btn')) {
            const newsId = newsItem.dataset.newsId;
            window.location.href = `news-detail.html?id=${newsId}`;
        }
    });
});