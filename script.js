document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('close-menu');
    const menu = document.querySelector('nav ul');

    hamburger.addEventListener('click', function() {
        menu.classList.toggle('show');
    });

    closeMenu.addEventListener('click', function() {
        menu.classList.remove('show');
    });
});
