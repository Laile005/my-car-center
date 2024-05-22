document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const closeMenu = document.getElementById('close-menu');
    const menu = document.getElementById('mobile_menu');
    const body = document.body;

    hamburger.addEventListener('click', function() {
        menu.classList.add('show');
        body.classList.add('no-scroll');
    });

    closeMenu.addEventListener('click', function() {
        menu.classList.remove('show');
        body.classList.remove('no-scroll');
    });

    // メニュー外をクリックして閉じる
    document.addEventListener('click', function(event) {
        if (!menu.contains(event.target) && event.target !== hamburger && menu.classList.contains('show')) {
            menu.classList.remove('show');
            body.classList.remove('no-scroll');
        }
    });
});
