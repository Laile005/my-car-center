document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('close-menu');
    const menu = document.getElementById('mobile_menu');

    hamburger.addEventListener('click', function() {
        menu.classList.toggle('show');
        hamburger.style.display = 'none';
        closeMenu.classList.add('show');
    });

    closeMenu.addEventListener('click', function() {
        menu.classList.remove('show');
        closeMenu.classList.remove('show');
        setTimeout(() => hamburger.style.display = 'block', 300); // メニューが閉じた後にハンバーガーアイコンを表示
    });
});
