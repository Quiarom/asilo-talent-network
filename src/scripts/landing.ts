// Interacciones de la landing de servicios (/servicios).

// Acordeón exclusivo: <details name> ya lo hace en navegadores modernos; esto cubre los demás.
function initAccordions(): void {
  if ("name" in HTMLDetailsElement.prototype) return;
  document.querySelectorAll<HTMLElement>("[data-accordion]").forEach((accordion) => {
    const items = accordion.querySelectorAll<HTMLDetailsElement>("details");
    items.forEach((item) =>
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => other !== item && (other.open = false));
      }),
    );
  });
}

initAccordions();

export {};
