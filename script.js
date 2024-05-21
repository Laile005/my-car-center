document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('close-menu');
    const menu = document.getElementById('mobile_menu');

    hamburger.addEventListener('click', function() {
        menu.classList.toggle('show');
        hamburger.classList.toggle('hidden');
        setTimeout(() => closeMenu.classList.toggle('show'), 300); // 300msの遅延を追加
    });

    closeMenu.addEventListener('click', function() {
        menu.classList.remove('show');
        closeMenu.classList.remove('show');
        setTimeout(() => hamburger.classList.remove('hidden'), 300); // 300msの遅延を追加
    });
});
