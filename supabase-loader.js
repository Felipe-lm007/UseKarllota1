(function loadSupabaseWhenConfigured(global, doc) {
  "use strict";

  const core = global.UsekarllotaCatalog;
  if (!core || !core.hasSupabaseConfig(global.USEKARLLOTA_CONFIG)) {
    global.usekarllotaSupabaseReady = Promise.resolve(false);
    return;
  }

  global.usekarllotaSupabaseReady = new Promise((resolve) => {
    const script = doc.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.addEventListener("load", () => resolve(true), { once: true });
    script.addEventListener("error", () => {
      console.warn("Usekarllota: não foi possível carregar o cliente do Supabase.");
      resolve(false);
    }, { once: true });
    doc.head.append(script);
  });
})(window, document);
