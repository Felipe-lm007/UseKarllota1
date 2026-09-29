(function publicCatalog(global, doc) {
  "use strict";

  function element(tag, className, value) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  }

  function makeCarousel(product) {
    const images = product.image_urls || [];
    if (images.length <= 1) {
      const link = element("a", "product-photo");
      link.href = global.USEKARLLOTA_CONFIG.whatsappUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (images.length) {
        const image = element("img");
        image.src = images[0];
        image.alt = (product.image_alts || [])[0] || product.name || "Produto Usekarllota";
        image.loading = "lazy";
        image.decoding = "async";
        link.append(image);
      }
      return link;
    }

    const carousel = element("div", "product-carousel");
    carousel.dataset.productCarousel = "";
    carousel.setAttribute("role", "region");
    carousel.setAttribute("aria-roledescription", "carrossel");
    carousel.setAttribute("aria-label", `Fotos de ${product.name || "produto"}`);
    const track = element("div", "product-carousel-track");
    images.forEach((url, index) => {
      const legacyClasses = [];
      if (product.slug === "vestido-balone" && index < 2) legacyClasses.push("balone-bege-frame");
      if (product.slug === "baby-doll-algodao" && index === 1) legacyClasses.push("baby-doll-rug-frame");
      const image = element("img", [index === 0 ? "is-active" : "", ...legacyClasses].filter(Boolean).join(" "));
      if (index === 0) image.src = url;
      else image.dataset.src = url;
      image.alt = (product.image_alts || [])[index] || product.name || "Produto Usekarllota";
      image.loading = "lazy";
      image.decoding = "async";
      track.append(image);
    });
    const previous = element("button", "product-carousel-arrow product-carousel-prev", "←");
    previous.type = "button";
    previous.setAttribute("aria-label", "Foto anterior");
    const next = element("button", "product-carousel-arrow product-carousel-next", "→");
    next.type = "button";
    next.setAttribute("aria-label", "Próxima foto");
    const dots = element("div", "product-carousel-dots");
    dots.setAttribute("aria-label", "Escolher foto");
    const status = element("span", "product-carousel-status", `1 de ${images.length}`);
    status.setAttribute("aria-live", "polite");
    carousel.append(track, previous, next, dots, status);
    return carousel;
  }

  function makeCard(product) {
    const card = element("article", "product-card");
    card.dataset.productId = product.id;
    if (product.audience === "slim") card.dataset.slimItem = product.slug;
    if (product.audience === "plus") card.dataset.plusItem = product.slug;
    if (product.audience === "accessories") card.dataset.accessoryItem = product.slug;
    card.append(makeCarousel(product));
    if (product.name) card.append(element(product.audience === "plus" ? "h4" : "h3", "", product.name));
    if (product.description) card.append(element("p", "", product.description));
    if ((product.price_lines || []).length) {
      const prices = element("div", "product-price");
      product.price_lines.forEach((line) => prices.append(element("strong", "", line)));
      card.append(prices);
    }
    const link = element("a", "text-link", product.link_label || "Consultar peça ↗");
    link.href = global.USEKARLLOTA_CONFIG.whatsappUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    card.append(link);
    return card;
  }

  function initCarousel(carousel) {
    const images = Array.from(carousel.querySelectorAll(".product-carousel-track img"));
    if (images.length < 2) return;
    const dots = carousel.querySelector(".product-carousel-dots");
    const status = carousel.querySelector(".product-carousel-status");
    let active = 0;
    function show(index) {
      active = (index + images.length) % images.length;
      const image = images[active];
      if (!image.src && image.dataset.src) image.src = image.dataset.src;
      images.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === active));
      Array.from(dots.children).forEach((dot, dotIndex) => dot.setAttribute("aria-pressed", String(dotIndex === active)));
      status.textContent = `${active + 1} de ${images.length}`;
    }
    images.forEach((_, index) => {
      const dot = element("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Mostrar foto ${index + 1}`);
      dot.addEventListener("click", () => show(index));
      dots.append(dot);
    });
    carousel.querySelector(".product-carousel-prev").addEventListener("click", () => show(active - 1));
    carousel.querySelector(".product-carousel-next").addEventListener("click", () => show(active + 1));
    show(0);
    carousel.classList.add("is-ready");
  }

  async function loadCatalog() {
    await (global.usekarllotaSupabaseReady || Promise.resolve(false));
    const core = global.UsekarllotaCatalog;
    const client = core && core.getClient();
    if (!client) return;
    const { data, error } = await client.from("products").select("*").eq("active", true).order("sort_order").order("created_at");
    if (error) {
      console.warn("Usekarllota: catálogo persistido indisponível; mantendo conteúdo estático.", error.message);
      return;
    }
    const groups = data.reduce((all, product) => {
      (all[product.section_id] ||= []).push(product);
      return all;
    }, {});
    Object.entries(groups).forEach(([sectionId, products]) => {
      const section = doc.getElementById(sectionId);
      const grid = section && section.querySelector(":scope .product-grid");
      if (!grid || !products.length) return;
      grid.replaceChildren(...products.map(makeCard));
      grid.querySelectorAll("[data-product-carousel]").forEach(initCarousel);
    });
    doc.documentElement.dataset.catalogSource = "supabase";
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", loadCatalog, { once: true });
  else loadCatalog();
})(window, document);
