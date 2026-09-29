(function adminApp(global, doc) {
  "use strict";

  const CATEGORIES = {
    slim: [
      ["slim-novidades", "Novidades"], ["destaques", "Vestidos"], ["slim-shorts", "Shorts"],
      ["slim-casual", "Looks casuais"], ["slim-pijamas", "Pijamas"],
    ],
    plus: [
      ["plus-vestidos", "Vestidos"], ["plus-blusas-bodies", "Blusas e bodies"], ["plus-shorts", "Shorts"],
      ["plus-combinacoes", "Combinações"], ["plus-moda-praia", "Moda praia"],
    ],
    accessories: [["acessorios", "Acessórios"]],
  };

  const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
  const core = global.UsekarllotaCatalog;
  let client = null;
  const setup = doc.getElementById("setup");
  const login = doc.getElementById("login");
  const dashboard = doc.getElementById("dashboard");
  const dialog = doc.getElementById("product-dialog");
  const form = doc.getElementById("product-form");
  const productList = doc.getElementById("product-list");
  const dashboardMessage = doc.getElementById("dashboard-message");
  const formMessage = doc.getElementById("form-message");
  let products = [];
  let sessionUser = null;
  let retainedImages = [];

  function setMessage(target, message, success = false) {
    target.textContent = message || "";
    target.classList.toggle("is-success", success);
  }

  function show(view) {
    setup.hidden = view !== "setup";
    login.hidden = view !== "login";
    dashboard.hidden = view !== "dashboard";
  }

  async function requireAdmin(user) {
    if (!user) return false;
    const { data, error } = await client.rpc("is_admin");
    if (error || data !== true) {
      await client.auth.signOut();
      setMessage(doc.getElementById("login-message"), "Esta conta não tem permissão para acessar o painel.");
      return false;
    }
    sessionUser = user;
    doc.getElementById("session-email").textContent = user.email;
    return true;
  }

  function updateCategoryOptions(selected) {
    const audience = doc.getElementById("product-audience").value;
    const select = doc.getElementById("product-section");
    select.replaceChildren(...CATEGORIES[audience].map(([value, label]) => {
      const option = doc.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    }));
    if (selected && CATEGORIES[audience].some(([value]) => value === selected)) select.value = selected;
  }

  function imagePreviewUrl(url) {
    if (/^(https?:|data:|blob:)/.test(url)) return url;
    return `../${url.replace(/^\.\//, "")}`;
  }

  function renderImages() {
    const container = doc.getElementById("current-images");
    container.replaceChildren();
    retainedImages.forEach((item, index) => {
      const wrapper = doc.createElement("div");
      wrapper.className = "admin-image";
      const image = doc.createElement("img");
      image.src = imagePreviewUrl(item.url);
      image.alt = item.alt || "Foto do produto";
      const remove = doc.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remover foto");
      remove.addEventListener("click", () => {
        retainedImages.splice(index, 1);
        renderImages();
      });
      wrapper.append(image, remove);
      container.append(wrapper);
    });
  }

  function renderProducts() {
    productList.replaceChildren();
    products.forEach((product) => {
      const row = doc.createElement("article");
      row.className = "admin-product";
      if (product.image_urls && product.image_urls[0]) {
        const image = doc.createElement("img");
        image.src = imagePreviewUrl(product.image_urls[0]);
        image.alt = "";
        row.append(image);
      } else {
        const placeholder = doc.createElement("span");
        placeholder.className = "admin-product-placeholder";
        row.append(placeholder);
      }
      const copy = doc.createElement("div");
      const name = doc.createElement("h2");
      name.textContent = product.name || "Produto sem nome";
      const details = doc.createElement("p");
      details.textContent = `${CATEGORIES[product.audience]?.find(([value]) => value === product.section_id)?.[1] || product.section_id} · ${(product.price_lines || []).join(" · ") || "Preço não informado"}`;
      const status = doc.createElement("span");
      status.className = `admin-status${product.active ? "" : " is-hidden"}`;
      status.textContent = product.active ? "Visível" : "Oculto";
      copy.append(name, details, status);
      const edit = doc.createElement("button");
      edit.className = "admin-secondary";
      edit.type = "button";
      edit.textContent = "Editar";
      edit.addEventListener("click", () => openEditor(product));
      row.append(copy, edit);
      productList.append(row);
    });
    doc.getElementById("empty-import").hidden = products.length !== 0;
  }

  async function loadProducts() {
    setMessage(dashboardMessage, "Carregando catálogo…");
    const { data, error } = await client.from("products").select("*").order("sort_order").order("created_at");
    if (error) {
      setMessage(dashboardMessage, `Não foi possível carregar: ${error.message}`);
      return;
    }
    products = data || [];
    setMessage(dashboardMessage, products.length ? `${products.length} produtos no catálogo. Armazenamento e permissões ativos.` : "Catálogo persistido vazio.", true);
    renderProducts();
  }

  function openEditor(product) {
    form.reset();
    setMessage(formMessage, "");
    const isEditing = Boolean(product);
    doc.getElementById("form-title").textContent = isEditing ? "Editar produto" : "Adicionar produto";
    doc.getElementById("delete-product").hidden = !isEditing;
    doc.getElementById("product-id").value = product?.id || "";
    doc.getElementById("product-name").value = product?.name || "";
    doc.getElementById("product-description").value = product?.description || "";
    doc.getElementById("product-prices").value = (product?.price_lines || []).join("\n");
    doc.getElementById("product-audience").value = product?.audience || "slim";
    updateCategoryOptions(product?.section_id);
    doc.getElementById("product-order").value = product?.sort_order ?? ((products.at(-1)?.sort_order || 0) + 10);
    doc.getElementById("product-active").checked = product?.active ?? true;
    retainedImages = (product?.image_urls || []).map((url, index) => ({ url, alt: (product.image_alts || [])[index] || product.name || "" }));
    renderImages();
    dialog.showModal();
  }

  function storagePathFromPublicUrl(url) {
    const marker = "/storage/v1/object/public/product-images/";
    const index = url.indexOf(marker);
    return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
  }

  async function uploadImages(files, productName) {
    const uploaded = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) throw new Error(`${file.name} não é uma imagem.`);
      if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} ultrapassa 6 MB.`);
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      const path = `${sessionUser.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await client.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = client.storage.from("product-images").getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, alt: productName });
    }
    return uploaded;
  }

  async function saveProduct(event) {
    event.preventDefault();
    const button = doc.getElementById("save-product");
    button.disabled = true;
    setMessage(formMessage, "Salvando…");
    try {
      const name = doc.getElementById("product-name").value.trim();
      const uploads = await uploadImages(Array.from(doc.getElementById("product-images").files), name);
      const images = [...retainedImages, ...uploads];
      const id = doc.getElementById("product-id").value;
      const payload = {
        name,
        slug: core.slugify(id ? products.find((item) => item.id === id)?.slug || name : `${name}-${crypto.randomUUID().slice(0, 8)}`),
        description: doc.getElementById("product-description").value.trim(),
        price_lines: doc.getElementById("product-prices").value.split("\n").map((line) => line.trim()).filter(Boolean),
        audience: doc.getElementById("product-audience").value,
        section_id: doc.getElementById("product-section").value,
        sort_order: Number(doc.getElementById("product-order").value),
        active: doc.getElementById("product-active").checked,
        image_urls: images.map((image) => image.url),
        image_alts: images.map((image) => image.alt || name),
        link_label: "Consultar peça ↗",
        updated_by: sessionUser.id,
      };
      const query = id ? client.from("products").update(payload).eq("id", id) : client.from("products").insert(payload);
      const { error } = await query;
      if (error) throw error;
      setMessage(formMessage, "Produto salvo.", true);
      await loadProducts();
      dialog.close();
    } catch (error) {
      setMessage(formMessage, `Não foi possível salvar: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  async function deleteProduct() {
    const id = doc.getElementById("product-id").value;
    const product = products.find((item) => item.id === id);
    if (!product || !global.confirm(`Excluir “${product.name || "Produto sem nome"}”? Essa ação não pode ser desfeita.`)) return;
    setMessage(formMessage, "Excluindo…");
    const { error } = await client.from("products").delete().eq("id", id);
    if (error) {
      setMessage(formMessage, `Não foi possível excluir: ${error.message}`);
      return;
    }
    const paths = (product.image_urls || []).map(storagePathFromPublicUrl).filter(Boolean);
    if (paths.length) await client.storage.from("product-images").remove(paths);
    dialog.close();
    await loadProducts();
  }

  async function importCatalog() {
    const button = doc.getElementById("import-catalog");
    button.disabled = true;
    setMessage(dashboardMessage, "Lendo e importando o catálogo atual…");
    try {
      const response = await fetch("../index.html", { cache: "no-store" });
      if (!response.ok) throw new Error("não foi possível ler index.html");
      const source = new DOMParser().parseFromString(await response.text(), "text/html");
      const records = core.extractProductsFromDocument(source).map((product) => ({ ...product, updated_by: sessionUser.id }));
      if (!records.length) throw new Error("nenhum produto foi encontrado");
      const { error } = await client.from("products").insert(records);
      if (error) throw error;
      setMessage(dashboardMessage, `${records.length} produtos importados.`, true);
      await loadProducts();
    } catch (error) {
      setMessage(dashboardMessage, `Importação não concluída: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  }

  async function loginWithPassword(event) {
    event.preventDefault();
    const message = doc.getElementById("login-message");
    setMessage(message, "Entrando…");
    const { data, error } = await client.auth.signInWithPassword({
      email: doc.getElementById("login-email").value.trim(),
      password: doc.getElementById("login-password").value,
    });
    if (error) {
      setMessage(message, "E-mail ou senha inválidos.");
      return;
    }
    if (await requireAdmin(data.user)) {
      show("dashboard");
      await loadProducts();
    }
  }

  async function initialize() {
    await (global.usekarllotaSupabaseReady || Promise.resolve(false));
    client = core && core.getClient();
    if (!client) {
      show("setup");
      return;
    }
    const { data } = await client.auth.getSession();
    if (data.session && await requireAdmin(data.session.user)) {
      show("dashboard");
      await loadProducts();
    } else {
      show("login");
    }
  }

  doc.getElementById("login-form").addEventListener("submit", loginWithPassword);
  doc.getElementById("logout").addEventListener("click", async () => { await client.auth.signOut(); sessionUser = null; show("login"); });
  doc.getElementById("new-product").addEventListener("click", () => openEditor(null));
  doc.getElementById("product-audience").addEventListener("change", () => updateCategoryOptions());
  doc.getElementById("import-catalog").addEventListener("click", importCatalog);
  doc.getElementById("delete-product").addEventListener("click", deleteProduct);
  form.addEventListener("submit", saveProduct);
  doc.querySelectorAll(".admin-close").forEach((button) => button.addEventListener("click", () => dialog.close()));
  initialize();
})(window, document);
