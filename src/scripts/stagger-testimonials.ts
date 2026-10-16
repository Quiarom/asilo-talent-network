// Carrusel escalonado de testimonios: tarjetas cuadradas inclinadas alrededor de una tarjeta central.
// Port en vanilla JS del componente StaggerTestimonials de React. Uso: un contenedor `data-stagger` con
// `.l-stagger-list > [data-stagger-card]` y botones `data-stagger-prev` / `data-stagger-next`.
// Con pocos testimonios se duplican tarjetas (ocultas a lectores de pantalla) para llenar el ancho.

const MIN_CARDS = 9;

function initStagger(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>(".l-stagger-list");
  const originals = Array.from(root.querySelectorAll<HTMLElement>("[data-stagger-card]"));
  if (!list || originals.length === 0) return;

  const cards = [...originals];
  // Cantidad impar y suficiente: la tarjeta central queda simétrica.
  for (let i = 0; cards.length < MIN_CARDS || cards.length % 2 === 0; i++) {
    const clone = originals[i % originals.length]!.cloneNode(true) as HTMLElement;
    clone.setAttribute("aria-hidden", "true");
    list.appendChild(clone);
    cards.push(clone);
  }

  const wide = window.matchMedia("(min-width: 640px)");
  const setSize = () => root.style.setProperty("--stagger-size", `${wide.matches ? 365 : 290}px`);
  const size = () => (wide.matches ? 365 : 290);

  const layout = () => {
    const half = Math.floor(cards.length / 2);
    cards.forEach((card, index) => {
      const position = index - half;
      const center = position === 0;
      const y = center ? -65 : position % 2 ? 15 : -15;
      const rotate = center ? 0 : position % 2 ? 2.5 : -2.5;
      card.style.transform = `translate(-50%, -50%) translateX(${(size() / 1.5) * position}px) translateY(${y}px) rotate(${rotate}deg)`;
      card.classList.toggle("is-center", center);
      card.dataset.position = String(position);
    });
  };

  const move = (steps: number) => {
    const moved: HTMLElement[] = [];
    if (steps > 0) {
      for (let i = 0; i < steps; i++) {
        const card = cards.shift();
        if (!card) return;
        cards.push(card);
        moved.push(card);
      }
    } else {
      for (let i = 0; i < -steps; i++) {
        const card = cards.pop();
        if (!card) return;
        cards.unshift(card);
        moved.push(card);
      }
    }
    // Las que dan la vuelta de un extremo al otro saltan sin animar, como si se re-montaran.
    moved.forEach((card) => (card.style.transition = "none"));
    layout();
    void root.offsetWidth;
    moved.forEach((card) => (card.style.transition = ""));
  };

  // Deslizar con el dedo cambia de tarjeta; el deslizamiento no cuenta como clic.
  let swipe: { x: number; y: number } | null = null;
  let swiped = false;
  root.addEventListener("pointerdown", (e) => {
    swipe = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
    swiped = false;
  });
  root.addEventListener("pointerup", (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      move(dx < 0 ? 1 : -1);
    }
  });
  root.addEventListener("pointercancel", () => (swipe = null));
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
  });

  cards.forEach((card) =>
    card.addEventListener("click", () => {
      if (swiped) return;
      move(Number(card.dataset.position ?? 0));
    }),
  );
  root.querySelector("[data-stagger-prev]")?.addEventListener("click", () => move(-1));
  root.querySelector("[data-stagger-next]")?.addEventListener("click", () => move(1));
  wide.addEventListener("change", () => {
    setSize();
    layout();
  });

  setSize();
  layout();
  root.dataset.ready = "";
}

document.querySelectorAll<HTMLElement>("[data-stagger]").forEach(initStagger);

export {};
