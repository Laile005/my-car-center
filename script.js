document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobile_menu');

    hamburger.addEventListener('click', function() {
        menu.classList.toggle('show');
    });
});
