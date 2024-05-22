document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('close-menu');
    const menu = document.getElementById('main_menu');
    const nav = document.querySelector('nav');
    const body = document.body;

    function checkScreenWidth() {
        const screenWidth = window.innerWidth;

        if (screenWidth < 1280) {
            nav.classList.add('mobile');
        } else {
            nav.classList.remove('mobile');
        }
    }

    window.addEventListener('resize', checkScreenWidth);
    checkScreenWidth();

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
