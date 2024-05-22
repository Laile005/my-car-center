document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('close-menu');
    const menu = document.getElementById('main_menu');
    const logo = document.querySelector('.logo img');
    const nav = document.querySelector('nav');
    const body = document.body;

    function checkOverlap() {
        const logoWidth = logo.clientWidth;
        const menuWidth = menu.clientWidth;
        const screenWidth = window.innerWidth;
        const padding = 40; // 左右の余白（ロゴの位置から計算）

        if (logoWidth + menuWidth + padding * 2 > screenWidth) {
            nav.classList.add('mobile');
        } else {
            nav.classList.remove('mobile');
        }
    }

    window.addEventListener('resize', checkOverlap);
    checkOverlap();

    hamburger.addEventListener('click', function() {
        menu.classList.toggle('show');
        hamburger.classList.add('hidden');
        closeMenu.classList.add('show');
        body.classList.add('no-scroll');
    });

    closeMenu.addEventListener('click', function() {
        menu.classList.remove('show');
        closeMenu.classList.remove('show');
        hamburger.classList.remove('hidden');
        body.classList.remove('no-scroll');
    });

    document.addEventListener('click', function(event) {
        if (!menu.contains(event.target) && !hamburger.contains(event.target) && menu.classList.contains('show')) {
            menu.classList.remove('show');
            closeMenu.classList.remove('show');
            hamburger.classList.remove('hidden');
            body.classList.remove('no-scroll');
        }
    });
});
