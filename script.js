document.addEventListener('DOMContentLoaded', function () {
  var navItems = document.querySelectorAll('.nav-item');
  var screens = document.querySelectorAll('.screen');

  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var target = item.getAttribute('data-screen');

      navItems.forEach(function (n) { n.classList.remove('active'); });
      item.classList.add('active');

      screens.forEach(function (s) {
        if (s.id === target) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });
  });
});
