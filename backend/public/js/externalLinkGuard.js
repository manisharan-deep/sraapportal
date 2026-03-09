document.addEventListener('click', function (event) {
  const anchor = event.target.closest('a[href]');
  if (!anchor) return;

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('/') || href.startsWith('#')) return;

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) {
      event.preventDefault();
      window.location.href = `/external-warning?target=${encodeURIComponent(url.href)}`;
    }
  } catch (error) {
  }
});
