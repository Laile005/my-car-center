document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('close-menu');
    const menu = document.getElementById('mobile_menu');

    hamburger.addEventListener('click', function() {
        menu.classList.toggle('show');
        hamburger.classList.add('hidden');
        setTimeout(() => closeMenu.classList.add('show'), 300); // メニューが展開されると同時に×アイコンを表示
    });

    closeMenu.addEventListener('click', function() {
        menu.classList.remove('show');
        closeMenu.classList.remove('show');
        setTimeout(() => hamburger.classList.remove('hidden'), 300); // メニューが閉じた後にハンバーガーアイコンを表示
    });
});
