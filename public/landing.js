/* FailureAI :: landing interactions */
(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const menuBtn = document.getElementById('menuBtn');
  const navLinks = document.getElementById('navLinks');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  const input = document.getElementById('heroInput');
  document.querySelectorAll('[data-demo]').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (!input) return;
      input.value = chip.dataset.demo;
      input.focus();
      input.closest('.search-box')?.classList.add('picked');
      setTimeout(() => input.closest('.search-box')?.classList.remove('picked'), 400);
    });
  });

  const form = document.getElementById('heroSearch');
  if (form && input) {
    form.addEventListener('submit', (e) => {
      if (!input.value.trim()) {
        e.preventDefault();
        input.placeholder = 'Pehle brand ka naam ya URL likho 🙂';
        input.focus();
      }
    });
  }

  // one-open FAQ accordion
  const faqs = [...document.querySelectorAll('.faq-list details')];
  faqs.forEach((d) => d.addEventListener('toggle', () => {
    if (d.open) faqs.filter((x) => x !== d).forEach((x) => { x.open = false; });
  }));

  // stagger the terminal lines on first view
  const lines = [...document.querySelectorAll('#termBody p')];
  if ('IntersectionObserver' in window && lines.length) {
    lines.forEach((p) => { p.style.opacity = '0'; p.style.transform = 'translateY(6px)'; p.style.transition = 'opacity .35s ease, transform .35s ease'; });
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      lines.forEach((p, i) => setTimeout(() => { p.style.opacity = '1'; p.style.transform = 'none'; }, i * 160));
      io.disconnect();
    }, { threshold: 0.25 });
    io.observe(document.getElementById('termBody'));
  }
})();
