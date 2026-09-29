(function catalogCore(global) {
  "use strict";

  const CONFIG_PLACEHOLDERS = ["COLE_AQUI", "YOUR_", "<"];

  function hasSupabaseConfig(config) {
    if (!config || typeof config.supabaseUrl !== "string" || typeof config.supabaseAnonKey !== "string") return false;
    return !CONFIG_PLACEHOLDERS.some((placeholder) =>
      config.supabaseUrl.includes(placeholder) || config.supabaseAnonKey.includes(placeholder),
    );
  }

  function slugify(value) {
    return String(value || "produto")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "produto";
  }

  function text(element) {
    return element ? element.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function closestCatalogSection(card) {
    let section = card.closest("section[id]");
    while (section && !section.querySelector(":scope > .product-grid, :scope .product-grid")) {
      section = section.parentElement && section.parentElement.closest("section[id]");
    }
    return section;
  }

  function extractProductsFromDocument(doc) {
    const usedSlugs = new Set();
    return Array.from(doc.querySelectorAll(".product-grid .product-card")).map((card, index) => {
      if (card.closest("[hidden]")) return null;
      const section = closestCatalogSection(card);
      if (!section) return null;
      const heading = card.querySelector("h3, h4");
      const name = text(heading);
      const description = text(Array.from(card.querySelectorAll(":scope > p")).find((node) => !node.closest(".product-price")));
      const priceLines = Array.from(card.querySelectorAll(".product-price strong")).map(text).filter(Boolean);
      const images = Array.from(card.querySelectorAll("img")).map((image) => ({
        url: image.getAttribute("src") || image.getAttribute("data-src") || "",
        alt: image.getAttribute("alt") || name,
      })).filter((image) => image.url);
      const link = card.querySelector(".text-link");
      const audience = section.closest('[data-catalog="plus"]') ? "plus" : section.closest('[data-catalog="slim"]') ? "slim" : "accessories";
      const sourceId = card.dataset.slimItem || card.dataset.plusItem || card.dataset.accessoryItem || "";
      let slug = slugify(sourceId || name || `${section.id}-${index + 1}`);
      let suffix = 2;
      while (usedSlugs.has(slug)) slug = `${slugify(sourceId || name || "produto")}-${suffix++}`;
      usedSlugs.add(slug);
      return {
        slug,
        name,
        description,
        price_lines: priceLines,
        audience,
        section_id: section.id,
        image_urls: images.map((image) => image.url),
        image_alts: images.map((image) => image.alt),
        link_label: text(link) || "Consultar peça ↗",
        sort_order: index * 10,
        active: true,
      };
    }).filter(Boolean);
  }

  function getClient() {
    const config = global.USEKARLLOTA_CONFIG;
    if (!hasSupabaseConfig(config) || !global.supabase || typeof global.supabase.createClient !== "function") return null;
    return global.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  global.UsekarllotaCatalog = Object.freeze({ hasSupabaseConfig, slugify, extractProductsFromDocument, getClient });
})(window);
