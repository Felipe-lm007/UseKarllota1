'use strict';
// Sem dependências ou requisições: funciona também ao abrir index.html diretamente.
document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#navigation');
menuButton.hidden = false;
function closeMenu(returnFocus = false) {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navigation.classList.contains('open'))
    closeMenu(true);
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.header')) closeMenu();
});
// Limpa o estado do menu quando a navegação volta ao layout de desktop.
const desktopNavigation = window.matchMedia('(min-width: 1051px)');
if (desktopNavigation.addEventListener) {
  desktopNavigation.addEventListener('change', () => closeMenu());
} else {
  desktopNavigation.addListener(() => closeMenu());
}
// Fotos enviadas pela loja, com tratamento de fundo.
const looks = [
  { image: 'assets/optimized/look-alfaiataria.webp', alt: 'Regata marrom com calça clara de alfaiataria', name: 'Regata e alfaiataria', description: 'Regata marrom, calça clara e acessórios dourados. Consulte as peças e os tamanhos disponíveis.', url: 'https://wa.me/message/ZLEX5CLASNCDG1' },
  { image: 'assets/optimized/look-poa-jeans.webp', alt: 'Blusa branca de poá com bermuda jeans', name: 'Poá e jeans', description: 'Blusa de poá, bermuda jeans e sandálias pretas. Consulte as peças e os tamanhos disponíveis.', url: 'https://wa.me/message/ZLEX5CLASNCDG1' },
];
const lookOptions = document.querySelector('.look-options');
lookOptions.hidden = false;
lookOptions.addEventListener('click', (event) => {
  const button = event.target.closest('[data-look]');
  if (!button) return;
  const index = Number(button.dataset.look);
  const look = looks[index];
  if (!look) return;
  lookOptions.querySelectorAll('button').forEach((item) => {
    item.classList.toggle('selected', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  const img = document.querySelector('#look-image');
  img.src = look.image;
  img.alt = look.alt;
  document.querySelector('#look-name').textContent = look.name;
  document.querySelector('#look-description').textContent = look.description;
  document.querySelector('#look-source').href = look.url;
});
if (
  'IntersectionObserver' in window &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  document
    .querySelectorAll('.section-heading,.card,.look-copy,.community-copy')
    .forEach((element) => observer.observe(element));
}

// Carrossel de fotos dentro dos cards de produto.
document.querySelectorAll('[data-product-carousel]').forEach((carousel) => {
  const slides = [...carousel.querySelectorAll('.product-carousel-track img')];
  const dots = carousel.querySelector('.product-carousel-dots');
  const status = carousel.querySelector('.product-carousel-status');
  const previous = carousel.querySelector('.product-carousel-prev');
  const next = carousel.querySelector('.product-carousel-next');
  let current = 0;
  let request = 0;
  let pointerStart = null;

  const loadSlide = async (slide) => {
    if (!slide.dataset.src) return;
    slide.src = slide.dataset.src;
    delete slide.dataset.src;
    try {
      await slide.decode();
    } catch {
      // O navegador ainda pode exibir a imagem mesmo sem suporte a decode().
    }
  };

  const commit = (index) => {
    current = index;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === current);
      slide.setAttribute('aria-hidden', String(slideIndex !== current));
    });
    [...dots.children].forEach((dot, dotIndex) =>
      dot.setAttribute('aria-pressed', String(dotIndex === current)),
    );
    status.textContent = `${current + 1} de ${slides.length}`;
  };

  const show = async (index) => {
    const target = (index + slides.length) % slides.length;
    if (target === current && slides[target].src) return;
    const ticket = ++request;
    carousel.classList.add('is-loading');
    carousel.setAttribute('aria-busy', 'true');
    await loadSlide(slides[target]);
    if (ticket !== request) return;
    commit(target);
    carousel.classList.remove('is-loading');
    carousel.removeAttribute('aria-busy');
  };

  slides.forEach((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Mostrar foto ${index + 1}`);
    dot.addEventListener('click', () => void show(index));
    dots.append(dot);
  });
  previous.addEventListener('click', () => void show(current - 1));
  next.addEventListener('click', () => void show(current + 1));
  carousel.tabIndex = 0;
  carousel.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    void show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  carousel.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') pointerStart = { x: event.clientX, y: event.clientY };
  });
  carousel.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      void show(current + (dx < 0 ? 1 : -1));
    }
  });
  carousel.addEventListener('pointercancel', () => (pointerStart = null));
  commit(0);
  carousel.classList.add('is-ready');
});

// Carrosséis das categorias.
('use strict');
// Classificação por peça; os tamanhos são consultados com a loja.
const catalogos = [
  { selector: '.casual-photo', name: 'Moda casual', items: [
    ['optimized/look-poa-jeans.webp', 'Blusa de poá e bermuda jeans'],
    ['optimized/look-alfaiataria.webp', 'Regata marrom e calça de alfaiataria'],
    ['optimized/macaquinho-azul.webp', 'Macaquinho azul com fivelas'],
    ['optimized/looks-manequins.webp', 'Três combinações da loja'],
  ] },
];
catalogos.forEach(({ selector, name, items }) => {
  const figure = document.querySelector(selector);
  if (!figure) return;
  const original = figure.querySelector('img');
  const frame = document.createElement('div');
  frame.className = 'vitrine-frame';
  original.replaceWith(frame);
  frame.append(original);
  const incoming = document.createElement('img');
  incoming.src = original.src;
  incoming.className = 'vitrine-incoming';
  incoming.alt = '';
  incoming.setAttribute('aria-hidden', 'true');
  frame.append(incoming);
  figure.classList.add('vitrine');
  figure.setAttribute('role', 'region');
  figure.setAttribute('aria-roledescription', 'carrossel');
  figure.setAttribute('aria-label', `Inspirações de ${name}`);
  const caption =
    figure.querySelector('figcaption') || document.createElement('figcaption');
  if (!caption.parentNode) figure.append(caption);
  caption.replaceChildren();
  const title = document.createElement('strong');
  caption.append(title);
  const controls = document.createElement('div');
  controls.className = 'vitrine-controls';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.textContent = '←';
  prev.setAttribute('aria-label', `Opção anterior de ${name}`);
  const status = document.createElement('span');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = '→';
  next.setAttribute('aria-label', `Próxima opção de ${name}`);
  controls.append(prev, status, next);
  figure.append(controls);
  const thumbs = document.createElement('div');
  thumbs.className = 'vitrine-thumbs';
  thumbs.setAttribute('role', 'group');
  thumbs.setAttribute('aria-label', `Escolher look de ${name}`);
  items.forEach(([file, label], i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-pressed', String(i === 0));
    const img = document.createElement('img');
    img.src = `assets/${file}`;
    img.alt = '';
    img.loading = 'lazy';
    img.width = 72;
    img.height = 90;
    b.append(img);
    b.addEventListener('click', () => show(i));
    thumbs.append(b);
  });
  figure.append(thumbs);
  let index = 0,
    request = 0;
  function update() {
    title.textContent = items[index][1];
    status.textContent = `${index + 1} de ${items.length}`;
    original.alt = `Inspiração: ${items[index][1]}`;
    Array.from(thumbs.children).forEach((b, i) =>
      b.setAttribute('aria-pressed', String(i === index)),
    );
  }
  async function show(target) {
    const nextIndex = (target + items.length) % items.length;
    if (nextIndex === index) return;
    const ticket = ++request;
    const url = `assets/${items[nextIndex][0]}`;
    const preload = new Image();
    preload.src = url;
    try {
      await preload.decode();
    } catch {
      if (ticket === request)
        status.textContent = 'Não foi possível carregar. Tente novamente.';
      return;
    }
    if (ticket !== request) return;
    incoming.getAnimations?.().forEach((a) => a.cancel());
    incoming.src = url;
    incoming.style.opacity = '0';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await incoming
        .animate(
          [
            { opacity: 0, transform: 'translateX(10px)' },
            { opacity: 1, transform: 'translateX(0)' },
          ],
          { duration: 260, easing: 'ease-out', fill: 'forwards' },
        )
        .finished.catch(() => {});
    }
    if (ticket !== request) return;
    original.src = url;
    index = nextIndex;
    update();
    incoming.getAnimations?.().forEach((a) => a.cancel());
    incoming.style.opacity = '0';
  }
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  frame.tabIndex = 0;
  frame.setAttribute(
    'aria-label',
    `${name}: deslize ou use as setas para trocar de opção`,
  );
  frame.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      show(index + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let touch = null;
  frame.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') touch = { x: e.clientX, y: e.clientY };
  });
  frame.addEventListener('pointerup', (e) => {
    if (!touch) return;
    const dx = e.clientX - touch.x,
      dy = e.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5)
      show(index + (dx < 0 ? 1 : -1));
  });
  frame.addEventListener('pointercancel', () => (touch = null));
  update();
});

