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

    // 导航栏滚动效果
    window.addEventListener('scroll', function() {
        const nav = document.querySelector('nav');
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // 滚动显示动画
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 60,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 随机背景图片
    const header = document.getElementById('header');
    const backgroundImages = [
        '/images/3cda066bccaefea3eb268d4ca10f018a.webp',
        '/images/Image_585028843869744.webp',
        '/images/Image_585018650004905.webp',
        '/images/Image_585012522922876.webp',
        '/images/Image_585006053756264.webp',
        '/images/Image_585000138805953.webp',
        '/images/Image_584991582604759.webp',
        '/images/Image_669234245588716.webp',
        '/images/Image_669226165759604.webp',
        '/images/Image_669218057352159.webp',
        '/images/Image_669214276923463.webp',
        '/images/Image_669203224465863.webp',
        '/images/Image_669202127295447.webp',
        '/images/Image_669192564244096.webp',
        '/images/Image_669027140045097.webp',
        '/images/Image_585061010780930.webp',
        '/images/Image_585054865315151.webp',
        '/images/Image_585036168830575.webp',
        '/images/Image_585018650004905.webp',
        '/images/Image_585006053756264.webp',
        '/images/9ae17d2b-8fb3-4f05-8a75-48c40de55bd0.webp',
        '/images/Image_669276986426772.webp',
    ];
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    const randomImage = backgroundImages[randomIndex];
    header.style.backgroundImage = `url(${randomImage})`;

    // 定时更换背景图片
    setInterval(() => {
        const newRandomIndex = Math.floor(Math.random() * backgroundImages.length);
        const newRandomImage = backgroundImages[newRandomIndex];
        header.style.backgroundImage = `url(${newRandomImage})`; // 修复：使用 newRandomImage
    }, 5000);
});