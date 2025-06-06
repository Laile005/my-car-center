// 現在の年を自動表示
document.addEventListener('DOMContentLoaded', function () {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ハンバーガーメニューの開閉
  const hamburger = document.getElementById('hamburger');
  const navMobile = document.getElementById('nav-mobile');

  hamburger.addEventListener('click', function () {
    // メニュー表示・非表示を切り替え
    if (navMobile.style.display === 'block') {
      navMobile.style.display = 'none';
    } else {
      navMobile.style.display = 'block';
    }
  });

  // モバイルメニュー項目をクリックしたら自動で閉じる
  const mobileMenuLinks = document.querySelectorAll('#nav-mobile a');
  mobileMenuLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navMobile.style.display = 'none';
    });
  });
});
