document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('close-menu');
    const menu = document.getElementById('mobile_menu');

    hamburger.addEventListener('click', function() {
        menu.classList.toggle('show');
        hamburger.classList.toggle('hidden');
        closeMenu.classList.toggle('show');
    });

    closeMenu.addEventListener('click', function() {
        menu.classList.remove('show');
        hamburger.classList.remove('hidden');
        closeMenu.classList.remove('show');
    });
});
