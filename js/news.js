/**
 * 新闻功能模块
 * 包含新闻列表、详情、分页、搜索等功能
 */

// 调试日志函数（与main.js保持一致）
function debugLog(...args) {
    if (window.debugMode) {
        console.log(...args);
    }
}

// 避免重复声明
if (typeof NewsManager === 'undefined') {
    class NewsManager {
    constructor() {
        this.currentPage = 0;
        this.itemsPerPage = window.innerWidth <= 768 ? 3 : 6;
        this.filteredNews = null;
        this.allNewsWithContent = [];
        this.NEWS_STORAGE_KEY = 'session_news_data';
        // 智能缓存策略：分层缓存时间
        this.CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时基础缓存
        this.STALE_DURATION = 30 * 60 * 1000; // 30分钟过期时间
        this.BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000; // 10分钟后台检查
        this.USER_ACTIVE_THRESHOLD = 5 * 60 * 1000; // 5分钟用户活跃阈值
        // 动态配置API端点，强制使用Cloudflare Pages（原始配置）
        this.GITHUB_RAW_BASE = 'https://luminolcraft-news.pages.dev/';
        this.GITEJSON_URL = 'https://luminolcraft-news.pages.dev/news.json';
        this.SITE_DOMAIN = window.location.hostname || '';
        this.errorLogged = new Set();
        
        // 缓存状态管理
        this.cacheStatus = {
            isStale: false,
            lastUpdate: null,
            backgroundRefreshTimer: null,
            userActivityTimer: null
        };
        
        this.init();
        
        // 输出初始化配置信息
        debugLog('🚀 NewsManager 初始化配置:', {
            environment: 'Cloudflare Pages (强制)',
            newsJsonUrl: this.GITEJSON_URL,
            contentBaseUrl: this.GITHUB_RAW_BASE,
            siteDomain: this.SITE_DOMAIN,
            itemsPerPage: this.itemsPerPage,
            cacheKey: this.NEWS_STORAGE_KEY,
            cacheDuration: this.CACHE_DURATION / 1000 / 60 + ' minutes',
            staleDuration: this.STALE_DURATION / 1000 / 60 + ' minutes',
            backgroundRefreshInterval: this.BACKGROUND_REFRESH_INTERVAL / 1000 / 60 + ' minutes',
            userActiveThreshold: this.USER_ACTIVE_THRESHOLD / 1000 / 60 + ' minutes'
        });
    }

    init() {
        this.initFromStorage();
        this.initMarked();
        this.initEventListeners();
        this.initSmartCache();
        this.setupCleanup();
    }

    // 设置清理机制
    setupCleanup() {
        // 页面卸载时清理定时器
        window.addEventListener('beforeunload', () => {
            if (this.cacheStatus.backgroundRefreshTimer) {
                clearInterval(this.cacheStatus.backgroundRefreshTimer);
            }
        });
    }

    // 初始化智能缓存系统
    initSmartCache() {
        this.setupBackgroundRefresh();
        this.setupUserActivityTracking();
        this.updateCacheStatus();
    }

    // 设置后台刷新
    setupBackgroundRefresh() {
        if (this.cacheStatus.backgroundRefreshTimer) {
            clearInterval(this.cacheStatus.backgroundRefreshTimer);
        }
        
        this.cacheStatus.backgroundRefreshTimer = setInterval(() => {
            this.checkAndRefreshCache();
        }, this.BACKGROUND_REFRESH_INTERVAL);
        
        debugLog('🔄 后台刷新已启动，间隔:', this.BACKGROUND_REFRESH_INTERVAL / 1000 / 60 + '分钟');
    }

    // 设置用户活跃度跟踪
    setupUserActivityTracking() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateUserActivity();
            }, { passive: true });
        });
        
        debugLog('👤 用户活跃度跟踪已启动');
    }

    // 更新用户活跃度
    updateUserActivity() {
        this.cacheStatus.userActivityTimer = Date.now();
        
        // 如果用户活跃且缓存过期，触发刷新
        if (this.cacheStatus.isStale) {
            debugLog('👤 检测到用户活跃，缓存已过期，触发刷新');
            // 添加错误处理，避免未捕获的Promise
            this.refreshCacheInBackground().catch(error => {
                debugLog('❌ 用户活跃触发刷新失败:', error.message);
            });
        }
    }

    // 检查并刷新缓存
    async checkAndRefreshCache() {
        const now = Date.now();
        const lastUpdate = this.cacheStatus.lastUpdate || 0;
        const timeSinceUpdate = now - lastUpdate;
        
        // 如果超过过期时间，标记为过期
        if (timeSinceUpdate > this.STALE_DURATION) {
            this.cacheStatus.isStale = true;
            this.updateCacheStatusIndicator();
            
            // 如果用户最近活跃，立即刷新
            const timeSinceActivity = now - (this.cacheStatus.userActivityTimer || 0);
            if (timeSinceActivity < this.USER_ACTIVE_THRESHOLD) {
                debugLog('🔄 用户活跃且缓存过期，立即刷新');
                await this.refreshCacheInBackground();
            }
        }
    }

    // 后台刷新缓存
    async refreshCacheInBackground() {
        try {
            debugLog('🔄 开始后台刷新缓存...');
            const response = await fetch(this.GITEJSON_URL, { 
                cache: 'no-store',
                headers: {
                    'User-Agent': 'LuminolCraft-News/1.0',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // 安全验证：检查数据结构
                if (this.validateNewsData(data)) {
                    await this.preloadMarkdownContent(data);
                    
                    // 更新缓存状态
                    this.cacheStatus.isStale = false;
                    this.cacheStatus.lastUpdate = Date.now();
                    
                    // 更新localStorage
                    localStorage.setItem('news-cache', JSON.stringify(data));
                    localStorage.setItem('news-cache-timestamp', this.cacheStatus.lastUpdate.toString());
                    
                    this.updateCacheStatusIndicator();
                    debugLog('✅ 后台缓存刷新成功');
                } else {
                    debugLog('❌ 数据验证失败，跳过缓存更新');
                }
            }
        } catch (error) {
            debugLog('❌ 后台缓存刷新失败:', error.message);
        }
    }

    // 验证新闻数据安全性
    validateNewsData(data) {
        if (!Array.isArray(data)) {
            debugLog('❌ 数据格式错误：不是数组');
            return false;
        }
        
        // 检查数据量限制（防止DoS攻击）
        if (data.length > 1000) {
            debugLog('❌ 数据量过大，可能存在攻击');
            return false;
        }
        
        // 验证每个新闻项的基本结构
        for (const item of data) {
            if (!item || typeof item !== 'object') {
                debugLog('❌ 新闻项格式错误');
                return false;
            }
            
            // 检查必要字段
            if (!item.id || !item.title || !item.content) {
                debugLog('❌ 新闻项缺少必要字段');
                return false;
            }
            
            // 检查字段长度限制
            if (item.title.length > 200 || item.content.length > 10000) {
                debugLog('❌ 新闻项字段过长');
                return false;
            }
            
            // 检查内容是否包含潜在XSS
            if (this.containsXSS(item.title) || this.containsXSS(item.content)) {
                debugLog('❌ 检测到潜在XSS攻击');
                return false;
            }
        }
        
        return true;
    }

    // 安全的HTML内容设置
    setSafeHTML(element, content) {
        if (!element) return;
        
        // 创建临时容器进行HTML转义
        const temp = document.createElement('div');
        temp.textContent = content;
        element.innerHTML = temp.innerHTML;
    }
    
    // 安全的innerHTML设置（带XSS检查）
    setSafeInnerHTML(element, content) {
        if (!element) return;
        
        // 检查内容是否包含XSS
        if (this.containsXSS(content)) {
            console.warn('检测到潜在XSS内容，已阻止:', content);
            element.textContent = '内容包含不安全元素，已过滤';
            return;
        }
        
        element.innerHTML = content;
    }

    // 增强的XSS检测
    containsXSS(text) {
        if (typeof text !== 'string') return false;
        
        // 先进行HTML实体解码检测
        const decodedText = text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&amp;/g, '&');
        
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript\s*:/gi,
            /vbscript\s*:/gi,
            /data\s*:\s*text\/html/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi,
            /<link[^>]*>/gi,
            /<meta[^>]*>/gi,
            /<style[^>]*>.*?<\/style>/gi,
            /expression\s*\(/gi,
            /url\s*\(/gi,
            /@import/gi,
            /eval\s*\(/gi,
            /setTimeout\s*\(/gi,
            /setInterval\s*\(/gi,
            /document\.write/gi,
            /innerHTML\s*=/gi,
            /outerHTML\s*=/gi
        ];
        
        // 检测原始文本和解码后的文本
        return xssPatterns.some(pattern => 
            pattern.test(text) || pattern.test(decodedText)
        );
    }

    // 更新缓存状态指示器
    updateCacheStatusIndicator() {
        const indicator = document.getElementById('cache-status-indicator');
        if (!indicator) return;
        
        const now = Date.now();
        const lastUpdate = this.cacheStatus.lastUpdate || 0;
        const timeSinceUpdate = now - lastUpdate;
        
        if (this.cacheStatus.isStale) {
            indicator.innerHTML = `
                <span style="color: #ff6b6b;">⚠️ 数据可能不是最新</span>
                <button onclick="newsManager.forceRefresh()" style="margin-left: 10px; padding: 2px 8px; font-size: 12px;">立即刷新</button>
            `;
        } else {
            const minutesAgo = Math.floor(timeSinceUpdate / 60000);
            indicator.innerHTML = `
                <span style="color: #51cf66;">✅ 数据已更新 ${minutesAgo}分钟前</span>
            `;
        }
    }

    // 强制刷新
    async forceRefresh() {
        debugLog('🔄 用户触发强制刷新');
        
        // 显示刷新状态
        const indicator = document.getElementById('cache-status-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <span style="color: #ffa500;">🔄 正在刷新数据...</span>
            `;
        }
        
        try {
            this.cacheStatus.isStale = true;
            await this.refreshCacheInBackground();
            
            // 重新加载新闻
            if (this.allNewsWithContent.length > 0) {
                await this.loadNews();
            }
            
            debugLog('✅ 强制刷新完成');
        } catch (error) {
            debugLog('❌ 强制刷新失败:', error.message);
            
            // 如果刷新失败，提供页面刷新选项
            if (indicator) {
                indicator.innerHTML = `
                    <span style="color: #ff6b6b;">❌ 数据刷新失败</span>
                    <button onclick="window.location.reload()" style="margin-left: 10px; padding: 2px 8px; font-size: 12px;">刷新页面</button>
                `;
            }
        }
    }

    // 重试数据加载 - 添加加载锁防止竞态条件
    async retryDataLoad() {
        // 防止重复调用
        if (this.isRetrying) {
            debugLog('⚠️ 重试操作正在进行中，跳过重复调用');
            return;
        }
        
        this.isRetrying = true;
        debugLog('🔄 用户触发数据重试加载');
        
        // 显示加载状态
        const indicator = document.getElementById('cache-status-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <span style="color: #ffa500;">🔄 正在重新加载数据...</span>
            `;
        }
        
        try {
            // 清除旧缓存
            localStorage.removeItem('news-cache');
            localStorage.removeItem('news-cache-timestamp');
            localStorage.removeItem('news-full-cache');
            localStorage.removeItem('news-full-cache-timestamp');
            sessionStorage.removeItem(this.NEWS_STORAGE_KEY);
            
            // 重置状态
            this.allNewsWithContent = [];
            this.filteredNews = null;
            this.currentPage = 0;
            
            debugLog('🧹 缓存已清除，状态已重置');
            
            // 重新初始化
            await this.initializeApp();
            
            debugLog('📊 初始化完成，数据量:', this.allNewsWithContent.length);
            
            // 重新加载新闻显示
            await this.loadNews();
            
            debugLog('🖼️ 新闻显示完成');
            
            // 重新初始化标签和搜索
            this.initTagSelect();
            
            debugLog('✅ 数据重试加载完成');
        } catch (error) {
            debugLog('❌ 数据重试加载失败:', error.message);
            
            // 如果重试失败，提供页面刷新选项
            if (indicator) {
                indicator.innerHTML = `
                    <span style="color: #ff6b6b;">❌ 重试失败，建议刷新页面</span>
                    <button onclick="window.location.reload()" style="margin-left: 10px; padding: 2px 8px; font-size: 12px;">刷新页面</button>
                `;
            }
        } finally {
            this.isRetrying = false;
        }
    }

    // 初始化标签选择器
    initTagSelect() {
        const tagSelect = document.getElementById('tag-select');
        if (tagSelect && this.allNewsWithContent.length > 0) {
            const uniqueTags = this.getUniqueTags(this.allNewsWithContent);
            tagSelect.innerHTML = '<option value="">所有标签</option>';
            uniqueTags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                tagSelect.appendChild(option);
            });
            debugLog('标签下拉菜单重新填充完成:', uniqueTags);
        }
    }

    // 更新缓存状态
    updateCacheStatus() {
        const timestamp = localStorage.getItem('news-cache-timestamp');
        if (timestamp) {
            this.cacheStatus.lastUpdate = parseInt(timestamp);
            const now = Date.now();
            const timeSinceUpdate = now - this.cacheStatus.lastUpdate;
            this.cacheStatus.isStale = timeSinceUpdate > this.STALE_DURATION;
        }
    }

    // 检测是否运行在Netlify环境中
    isNetlifyEnvironment() {
        // 检测是否运行在Netlify环境中（排除本地开发环境）
        const hostname = window.location.hostname;
        const isNetlify = hostname.includes('netlify.app') || 
                         hostname.includes('netlify.com') ||
                         hostname.includes('craft.luminolsuki.moe');
        
        // 控制台输出环境检测结果
        debugLog('🌐 环境检测结果:', {
            hostname: hostname,
            isNetlifyEnvironment: isNetlify,
            apiMode: isNetlify ? 'Netlify Function' : 'GitHub Raw',
            newsJsonUrl: isNetlify ? '/.netlify/functions/news' : 'https://raw.githubusercontent.com/LuminolCraft/news.json/main/news.json',
            contentBaseUrl: 'https://luminolcraft-news.pages.dev/'
        });
        
        return isNetlify;
    }

    // 安全的从sessionStorage初始化数据
    initFromStorage() {
        const stored = sessionStorage.getItem(this.NEWS_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                
                // 验证数据安全性
                if (!this.validateNewsData(parsed)) {
                    console.warn('sessionStorage数据验证失败，已清除');
                    sessionStorage.removeItem(this.NEWS_STORAGE_KEY);
                    return;
                }
                
                this.allNewsWithContent = parsed;
                debugLog('从sessionStorage恢复新闻数据');
            } catch (e) {
                console.error('解析sessionStorage数据失败', e);
                sessionStorage.removeItem(this.NEWS_STORAGE_KEY);
            }
        }
    }

    // 简单的 markdown 渲染器（fallback）
    simpleMarkdownRender(text) {
        if (!text) return '';
        
        // 安全处理：转义HTML特殊字符
        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
        
        // 基础转换（安全版本）
        let html = escapeHtml(text)
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
                // 验证URL安全性
                if (!this.isValidUrl(href)) {
                    return escapeHtml(text); // 如果URL不安全，只显示文本
                }
                
                const isExternal = !href.startsWith('/') && !href.includes(this.SITE_DOMAIN) && !href.startsWith('#');
                const svgIcon = isExternal ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>' : '';
                return `<a href="${escapeHtml(href)}" class="${isExternal ? 'external-link' : ''}" ${isExternal ? 'rel="noopener noreferrer"' : ''}>${escapeHtml(text)}${svgIcon}</a>`;
            });
            
        return '<p>' + html + '</p>';
    }

    // 增强的URL验证
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            
            // 只允许HTTPS协议
            if (urlObj.protocol !== 'https:') {
                return false;
            }
            
            // 严格的白名单域名检查
            const allowedDomains = [
                'luminolcraft-news.pages.dev',
                'raw.githubusercontent.com',
                'github.com',
                'cdn.jsdelivr.net',
                'cdnjs.cloudflare.com',
                'cdn-font.hyperos.mi.com'
            ];
            
            // 检查域名是否在白名单中
            if (!allowedDomains.includes(urlObj.hostname)) {
                return false;
            }
            
            // 检查路径是否安全（防止路径注入）
            const dangerousPaths = ['../', './', '//', '\\'];
            if (dangerousPaths.some(path => urlObj.pathname.includes(path))) {
                return false;
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }

    // 初始化marked库
    initMarked() {
        if (typeof document === 'undefined') {
            console.error('document 未定义，可能在非浏览器环境运行或 DOM 未加载');
            return false;
        }
        if (typeof marked === 'undefined') {
            console.warn('marked 库未加载，使用简化渲染器作为备用方案');
            return false;
        }
        debugLog('marked 库加载成功，版本:', marked.version || '未知');
        const renderer = new marked.Renderer();
        renderer.link = (href, title, text) => {
            const isValidHref = typeof href === 'string' && href.trim() !== '';
            const isExternal = isValidHref && !href.startsWith('/') && !href.includes(this.SITE_DOMAIN) && !href.startsWith('#');
            const svgIcon = isExternal ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 ml-1 align-sub" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>` : '';
            if (!isValidHref) return text;
            return `<a href="${href}" ${title ? `title="${title}"` : ''} class="${isExternal ? 'external-link' : ''}">${text}${svgIcon}</a>`;
        };
        marked.setOptions({ renderer });
        return true;
    }

    // 延迟初始化marked
    tryInitializeMarked(attempts = 5, delay = 100) {
        if (this.initMarked()) return;
        if (attempts <= 0) {
            console.error('多次尝试后仍无法加载 marked，放弃初始化');
            return;
        }
        debugLog(`尝试初始化marked，剩余尝试次数: ${attempts}`);
        setTimeout(() => this.tryInitializeMarked(attempts - 1, delay * 2), delay);
    }

    // 初始化事件监听器
    initEventListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', debounce(() => {
                this.itemsPerPage = window.innerWidth <= 768 ? 3 : 6;
                this.loadNews();
            }, 200));
        }
    }

    // 将GitHub URL转换为Cloudflare URL
    convertGitHubUrlToCloudflare(contentUrl) {
        if (!contentUrl.startsWith('http')) {
            // 相对路径，转换为Cloudflare URL
            return `https://luminolcraft-news.pages.dev/${contentUrl}`;
        }
        
        if (contentUrl.includes('raw.githubusercontent.com/LuminolCraft/news.json')) {
            // GitHub URL，转换为Cloudflare URL
            const path = contentUrl.split('raw.githubusercontent.com/LuminolCraft/news.json')[1];
            const cleanPath = path.replace('/refs/heads/main', '');
            return `https://luminolcraft-news.pages.dev${cleanPath}`;
        }
        
        // 处理其他GitHub URL格式
        if (contentUrl.includes('raw.githubusercontent.com/LuminolMC/Luminol')) {
            // 这是另一个GitHub仓库的URL，需要特殊处理
            debugLog('检测到LuminolMC仓库URL，跳过加载:', contentUrl);
            return null; // 返回null表示跳过这个URL
        }
        
        // 其他情况，直接返回原URL
        return contentUrl;
    }

    // 预加载Markdown内容
    async preloadMarkdownContent(newsData) {
        debugLog('📚 预加载 Markdown 内容...', {
            itemCount: newsData.length,
            baseUrl: this.GITHUB_RAW_BASE,
            environment: this.isNetlifyEnvironment() ? 'Netlify' : 'External'
        });
        
        debugLog('预加载 Markdown 内容...');
        const now = Date.now();
        const cached = localStorage.getItem('news-full-cache');
        const timestamp = localStorage.getItem('news-full-cache-timestamp');

        if (cached && timestamp && (now - parseInt(timestamp)) < this.CACHE_DURATION) {
            this.allNewsWithContent = JSON.parse(cached);
            debugLog('🗄️ 使用缓存的完整新闻数据');
            debugLog('使用缓存的完整新闻数据');
            sessionStorage.setItem(this.NEWS_STORAGE_KEY, JSON.stringify(this.allNewsWithContent));
            return;
        }

        for (const item of newsData) {
            let fullContentUrl = null;
            try {
                fullContentUrl = this.convertGitHubUrlToCloudflare(item.content);
                
                debugLog(`📄 加载 Markdown[${item.id}]:`, {
                    title: item.title,
                    originalPath: item.content,
                    fullUrl: fullContentUrl,
                    isAbsoluteUrl: item.content.startsWith('http')
                });
                
                // 如果返回null，跳过这个条目
                if (fullContentUrl === null) {
                    debugLog(`跳过新闻 ${item.id}: 不支持的URL格式`);
                    item.markdownContent = '内容不可用';
                    continue;
                }
                
                debugLog(`加载 Markdown: ${fullContentUrl}`);
                const response = await fetch(fullContentUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error(`无法加载: ${fullContentUrl} (状态: ${response.status})`);
                const markdownContent = await response.text();
                item.markdownContent = markdownContent || '暂无内容';
                item.additionalImages = item.additionalImages?.filter(url => url && url.trim() !== '') || [];
                
                debugLog(`✅ Markdown[${item.id}] 加载成功:`, {
                    contentLength: markdownContent.length + ' chars',
                    additionalImages: item.additionalImages.length
                });
            } catch (error) {
                console.error(`❌ 预加载新闻 ${item.id} 失败:`, {
                    error: error.message,
                    url: fullContentUrl || '未知URL',
                    title: item.title
                });
                item.markdownContent = '内容加载失败';
            }
        }
        this.allNewsWithContent = newsData;
        localStorage.setItem('news-full-cache', JSON.stringify(this.allNewsWithContent));
        localStorage.setItem('news-full-cache-timestamp', now.toString());
        sessionStorage.setItem(this.NEWS_STORAGE_KEY, JSON.stringify(this.allNewsWithContent));
        debugLog('新闻数据加载完成并缓存到sessionStorage');
    }

    // 获取唯一标签
    getUniqueTags(newsData) {
        const tagsSet = new Set();
        newsData.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet);
    }

    // 筛选新闻
    filterNews() {
        const tagSelect = document.getElementById('tag-select');
        const searchInput = document.getElementById('news-search-input');
        const tag = tagSelect ? tagSelect.value : '';
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        debugLog('筛选条件:', { tag, query });

        this.filteredNews = this.allNewsWithContent.filter(item => {
            const matchesTag = !tag || (item.tags && item.tags.includes(tag));
            const dateStr = item.date ? new Date(item.date).toLocaleDateString('zh-CN') : '';
            const matchesQuery = !query || 
                (item.title && item.title.toLowerCase().includes(query)) || 
                (item.markdownContent && item.markdownContent.toLowerCase().includes(query)) ||
                (dateStr.toLowerCase().includes(query));
            return matchesTag && matchesQuery;
        });

        debugLog('筛选结果:', { filteredNewsCount: this.filteredNews.length });

        this.currentPage = 0;
        this.loadNews();
    }

    // 安全的fetch请求（带超时控制）
    async safeFetch(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    }

    // 初始化应用
    async initializeApp() {
        debugLog('检查 DOM 元素:', {
            newsGrid: !!document.querySelector('#news-grid'),
            paginationContainer: !!document.querySelector('#news-pagination'),
            tagSelect: !!document.getElementById('tag-select'),
            searchInput: !!document.getElementById('news-search-input'),
            cacheIndicator: !!document.getElementById('cache-status-indicator')
        });

        try {
            debugLog('📡 正在加载新闻数据...', {
                url: this.GITEJSON_URL,
                method: 'fetch',
                cache: 'no-store'
            });
            
            const response = await this.safeFetch(this.GITEJSON_URL, { cache: 'no-store' });
            
            debugLog('📡 API响应状态:', {
                url: this.GITEJSON_URL,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: {
                    'content-type': response.headers.get('content-type'),
                    'content-length': response.headers.get('content-length')
                }
            });
            
            if (!response.ok) {
                throw new Error(`无法加载 news.json: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            
            // 安全验证：检查数据结构
            if (!this.validateNewsData(data)) {
                throw new Error('数据验证失败，可能存在安全风险');
            }
            
            debugLog('✅ news.json 加载成功:', {
                itemCount: data.length,
                firstItem: data[0]?.title || '无数据',
                dataSize: JSON.stringify(data).length + ' bytes'
            });
            debugLog('news.json 加载成功:', data);
            localStorage.setItem('news-cache', JSON.stringify(data));
            localStorage.setItem('news-cache-timestamp', new Date().getTime().toString());
            
            // 更新缓存状态
            this.cacheStatus.lastUpdate = Date.now();
            this.cacheStatus.isStale = false;
            this.updateCacheStatusIndicator();
            
            await this.preloadMarkdownContent(data);
            debugLog('allNewsWithContent:', this.allNewsWithContent);
        } catch (error) {
            console.error('初始化加载 news.json 失败:', error.message);
            const newsGrid = document.querySelector('#news-grid');
            if (newsGrid) {
                newsGrid.innerHTML = `
                    <div class="error-message">
                        <h3>❌ 无法加载新闻数据</h3>
                        <p>请检查网络连接，然后点击上方的"重试"按钮</p>
                    </div>`;
            }
            
            // 更新缓存状态为错误
            const indicator = document.getElementById('cache-status-indicator');
            if (indicator) {
                indicator.innerHTML = `
                    <span style="color: #ff6b6b;">❌ 数据加载失败</span>
                    <button onclick="newsManager.retryDataLoad()" style="margin-left: 10px; padding: 2px 8px; font-size: 12px;">重试</button>
                `;
            }
        }
    }

    // 更新分页
    updatePagination(totalItems) {
        const paginationContainer = document.getElementById('news-pagination');
        if (!paginationContainer) return;

        const pageCount = Math.ceil(totalItems / this.itemsPerPage);
        paginationContainer.innerHTML = '';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.textContent = '上一页';
        prevBtn.disabled = this.currentPage === 0;
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.loadNews();
            }
        });
        paginationContainer.appendChild(prevBtn);

        for (let i = 0; i < pageCount; i++) {
            const btn = document.createElement('button');
            btn.className = `pagination-btn ${i === this.currentPage ? 'active' : ''}`;
            btn.textContent = i + 1;
            btn.addEventListener('click', () => {
                this.currentPage = i;
                this.loadNews();
            });
            paginationContainer.appendChild(btn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.textContent = '下一页';
        nextBtn.disabled = this.currentPage === pageCount - 1;
        nextBtn.addEventListener('click', () => {
            if (this.currentPage < pageCount - 1) {
                this.currentPage++;
                this.loadNews();
            }
        });
        paginationContainer.appendChild(nextBtn);
    }

    // 加载新闻
    async loadNews() {
        const newsGrid = document.querySelector('#news-grid');
        if (!newsGrid) return;
        
        debugLog('🖼️ 开始加载新闻，当前数据量:', this.allNewsWithContent.length);
        
        this.initFromStorage();
        
        if (!this.allNewsWithContent || this.allNewsWithContent.length === 0) {
            debugLog('📡 数据为空，重新初始化...');
            await this.initializeApp();
        }

        try {
            let newsData = this.filteredNews !== null ? this.filteredNews : this.allNewsWithContent;
            
            debugLog('📊 准备显示新闻，数据量:', newsData.length);

            // 排序逻辑
            newsData = newsData.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return new Date(b.date) - new Date(a.date);
            });

            // 分页逻辑
            const start = this.currentPage * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            const paginatedData = newsData.slice(start, end);

            newsGrid.innerHTML = '';
            let hasImage;

            paginatedData.forEach(item => {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item';

                if (item.pinned) {
                    newsItem.classList.add('pinned');
                }

                newsItem.addEventListener('click', () => {
                    window.location.href = `news-detail.html?id=${item.id}`;
                });

                const title = document.createElement('h3');
                // 安全的标题设置
                const titleText = item.pinned ? `📌 ${item.title}` : item.title;
                title.textContent = titleText;

                const meta = document.createElement('div');
                meta.className = 'news-meta';
                
                // 安全的日期设置
                const dateSpan = document.createElement('span');
                dateSpan.className = 'news-date';
                dateSpan.textContent = new Date(item.date).toLocaleDateString('zh-CN');
                
                // 安全的标签设置
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'news-tags';
                item.tags.forEach(tag => {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'tag';
                    tagSpan.textContent = tag;
                    tagsDiv.appendChild(tagSpan);
                });
                
                meta.appendChild(dateSpan);
                meta.appendChild(tagsDiv);

                hasImage = false;
                const imgContainer = document.createElement('div');
                imgContainer.className = 'news-img';
                if (item.image && item.image.trim() !== '' && item.image !== '""') {
                    // 安全的图片URL设置
                    const imageUrl = item.image.replace(/['"]/g, ''); // 移除引号
                    if (imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
                        imgContainer.style.backgroundImage = `url('${imageUrl}')`;
                        hasImage = true;
                    }
                }
                if (!hasImage) {
                    newsItem.classList.add('no-image');
                }

                const content = document.createElement('div');
                content.className = 'news-content';
                const shortContent = item.markdownContent
                    ? item.markdownContent.substring(0, 100) + '...'
                    : '暂无内容';
                // 检查marked库是否可用，否则使用fallback
                if (typeof marked !== 'undefined') {
                    const parsedContent = marked.parse(shortContent);
                    this.setSafeInnerHTML(content, parsedContent);
                } else {
                    content.innerHTML = this.simpleMarkdownRender(shortContent);
                }

                newsItem.appendChild(title);
                newsItem.appendChild(meta);
                if (hasImage) newsItem.appendChild(imgContainer);
                newsItem.appendChild(content);

                newsGrid.appendChild(newsItem);
            });

            this.updatePagination(newsData.length);
            debugLog('✅ 新闻显示完成，共显示', paginatedData.length, '条新闻');
        } catch (error) {
            console.error('加载新闻失败:', error);
            debugLog('❌ 加载新闻失败:', error.message);
            newsGrid.innerHTML = '<p class="error-message">加载新闻失败，请重试</p>';
        }
    }

    // 渲染新闻详情
    async renderNewsDetail() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = parseInt(urlParams.get('id'));
        if (!id || !this.allNewsWithContent.length) {
            document.getElementById('news-detail').innerHTML = '<p class="error-message">新闻未找到</p>';
            document.title = '新闻未找到 - LuminolCraft';
            return;
        }
        const newsItem = this.allNewsWithContent.find(item => item.id === id);
        if (!newsItem) {
            document.getElementById('news-detail').innerHTML = '<p class="error-message">新闻未找到</p>';
            document.title = '新闻未找到 - LuminolCraft';
            return;
        }

        // 设置页面标题
        document.title = `${newsItem.title} - LuminolCraft`;

        const newsDetail = document.getElementById('news-detail');
        newsDetail.innerHTML = '';

        const title = document.createElement('h2');
        title.textContent = newsItem.pinned ? `📌 ${newsItem.title}` : newsItem.title;
        const date = document.createElement('div');
        date.className = 'news-date';
        date.textContent = new Date(newsItem.date).toLocaleDateString('zh-CN');
        const tags = document.createElement('div');
        tags.className = 'news-tags';
        newsItem.tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.textContent = tag;
            tags.appendChild(tagEl);
        });

        let hasImage = false;
        const newsImgContainer = document.createElement('div');
        newsImgContainer.className = 'news-img';
        if (newsItem.image && newsItem.image.trim() !== '' && newsItem.image !== '""') {
            newsImgContainer.style.backgroundImage = `url('${newsItem.image}')`;
            newsImgContainer.style.width = '100%';
            newsImgContainer.style.aspectRatio = '16 / 9';
            newsImgContainer.style.backgroundSize = 'contain';
            newsImgContainer.style.backgroundRepeat = 'no-repeat';
            newsImgContainer.style.backgroundPosition = 'center';
            hasImage = true;
        }
        if (!hasImage) {
            newsDetail.classList.add('no-image');
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'news-content';
        // 检查marked库是否可用，否则使用fallback
        if (typeof marked !== 'undefined') {
            const parsedContent = marked.parse(newsItem.markdownContent || '');
            this.setSafeInnerHTML(contentDiv, parsedContent);
        } else {
            contentDiv.innerHTML = this.simpleMarkdownRender(newsItem.markdownContent || '');
        }

        const gallerySection = document.createElement('div');
        gallerySection.className = 'gallery-section';
        const galleryTitle = document.createElement('h3');
        galleryTitle.textContent = '附加图片';
        gallerySection.appendChild(galleryTitle);
        const galleryGrid = document.createElement('div');
        galleryGrid.className = 'gallery-grid';
        if (newsItem.additionalImages && newsItem.additionalImages.length > 0) {
            newsItem.additionalImages.forEach(imgUrl => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                const galleryImg = document.createElement('img');
                galleryImg.src = imgUrl;
                galleryImg.alt = '附加图片';
                galleryImg.onerror = () => {
                    galleryImg.src = 'https://via.placeholder.com/200x150/9e94d8/ffffff?text=附加图片不可用';
                    console.warn(`附加图片加载失败: ${imgUrl}，使用占位符`);
                };
                galleryItem.appendChild(galleryImg);
                galleryGrid.appendChild(galleryItem);
                galleryImg.addEventListener('click', () => {
                    const lightbox = document.querySelector('.lightbox');
                    const lightboxImg = document.querySelector('.lightbox-image');
                    lightboxImg.src = imgUrl;
                    lightboxImg.onerror = () => {
                        lightboxImg.src = 'https://via.placeholder.com/300x200/9e94d8/ffffff?text=图片不可用';
                    };
                    lightbox.style.display = 'flex';
                });
            });
        } else {
            galleryGrid.innerHTML = '<p class="empty-message">暂无附加图片</p>';
        }
        gallerySection.appendChild(galleryGrid);

        newsDetail.appendChild(title);
        newsDetail.appendChild(date);
        newsDetail.appendChild(tags);
        newsDetail.appendChild(newsImgContainer);
        newsDetail.appendChild(contentDiv);
        newsDetail.appendChild(gallerySection);

        const lightbox = document.querySelector('.lightbox');
        if (lightbox) {
            document.querySelector('.lightbox-close').addEventListener('click', () => {
                lightbox.style.display = 'none';
            });
        }

        // 初始化代码高亮 - 使用 Prism.js
        setTimeout(() => {
            if (typeof Prism !== 'undefined') {  
                // Prism.js 会自动处理所有带有 language-* 类的代码块
                Prism.highlightAll();
                
                // 为没有语言标识的代码块尝试自动检测
                document.querySelectorAll('pre code:not([class*="language-"])').forEach((block) => {
                    const text = block.textContent;
                    
                    // Gradle 检测
                    if (text.includes('gradle') || text.includes('build.gradle') || text.includes('apply plugin') || text.includes('dependencies {')) {
                        block.className = 'language-gradle';
                    }
                    // Shell/Bash 检测
                    else if (text.includes('#!/bin/bash') || text.includes('#!/bin/sh') || text.includes('$ ') || text.includes('sudo ') || text.includes('npm ') || text.includes('yarn ')) {
                        block.className = 'language-bash';
                    }
                    // Shell Session 检测 (带提示符的命令行)
                    else if (text.includes('$ ') || text.includes('# ') || text.includes('> ') || text.includes('PS ')) {
                        block.className = 'language-shell-session';
                    }
                    // Docker 检测 (使用 bash 代替，因为 dockerfile 组件不可用)
                    else if (text.includes('FROM ') || text.includes('RUN ') || text.includes('COPY ') || text.includes('WORKDIR ')) {
                        block.className = 'language-bash';
                    }
                    // YAML 检测
                    else if (text.includes('---') || text.includes('apiVersion:') || text.includes('kind:')) {
                        block.className = 'language-yaml';
                    }
                    // JSON 检测
                    else if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
                        block.className = 'language-json';
                    }
                    // JavaScript 检测
                    else if (text.includes('function') || text.includes('const ') || text.includes('let ') || text.includes('var ')) {
                        block.className = 'language-javascript';
                    }
                    // Java 检测
                    else if (text.includes('public class') || text.includes('import ') || text.includes('System.out.println')) {
                        block.className = 'language-java';
                    }
                    // Python 检测
                    else if (text.includes('def ') || text.includes('import ') || text.includes('print(') || text.includes('if __name__')) {
                        block.className = 'language-python';
                    }
                    
                    // 重新高亮
                    Prism.highlightElement(block);
                });
                
                // 初始化代码块工具栏
                this.initCodeBlockToolbar();
                
                // 监听全站主题变化
                this.initThemeListener();
            }
        }, 200);
    }

    // 初始化代码块工具栏
    initCodeBlockToolbar() {
        const codeBlocks = document.querySelectorAll('.news-content pre[class*="language-"]');
        
        codeBlocks.forEach((pre, index) => {
            // 创建容器
            const container = document.createElement('div');
            container.className = 'code-block-container';
            
            // 创建工具栏
            const toolbar = document.createElement('div');
            toolbar.className = 'code-block-toolbar';
            
            // 创建复制按钮
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-block-btn copy-btn';
            copyBtn.textContent = '复制';
            copyBtn.title = '复制代码';
            
            // 添加到工具栏
            toolbar.appendChild(copyBtn);
            
            // 包装代码块
            pre.parentNode.insertBefore(container, pre);
            container.appendChild(pre);
            container.appendChild(toolbar);
            
            // 代码块跟随全站主题切换
            this.updateCodeBlockTheme(container);
            
            // 复制功能
            copyBtn.addEventListener('click', async () => {
                const code = pre.querySelector('code');
                const text = code ? code.textContent : pre.textContent;
                
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.textContent = '已复制';
                    copyBtn.classList.add('copied');
                    
                    setTimeout(() => {
                        copyBtn.textContent = '复制';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    // 降级方案
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    copyBtn.textContent = '已复制';
                    copyBtn.classList.add('copied');
                    
                    setTimeout(() => {
                        copyBtn.textContent = '复制';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                }
            });
        });
    }

    // 更新代码块主题
    updateCodeBlockTheme(container) {
        const isDark = document.body.classList.contains('dark-theme');
        if (isDark) {
            container.classList.add('code-block-dark');
        } else {
            container.classList.remove('code-block-dark');
        }
    }

    // 初始化主题监听器
    initThemeListener() {
        // 监听 body 类变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const codeBlocks = document.querySelectorAll('.code-block-container');
                    codeBlocks.forEach(container => {
                        this.updateCodeBlockTheme(container);
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

}

    // 导出类（如果使用模块化）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = NewsManager;
    }

    // 如果在浏览器环境中，创建全局实例
    if (typeof window !== 'undefined') {
        window.NewsManager = NewsManager;
    }
}