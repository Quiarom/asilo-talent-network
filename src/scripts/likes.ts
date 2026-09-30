/**
 * Like buttons (`[data-like]`), wired once through event delegation so cards
 * swapped in later by the directory refresh keep working.
 *
 * The server is the source of truth (one like per voter cookie, per-network
 * cap). localStorage only remembers which buttons to paint as pressed; if it
 * is cleared or blocked, a repeat click is simply idempotent on the server.
 */

const STORAGE_KEY = "asilo-builders:likes";

function readLiked(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function writeLiked(liked: Set<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...liked]));
  } catch {
    // Private mode / blocked storage: the pressed state just won't persist.
  }
}

const liked = readLiked();

// One polite live region so failures are announced, not just shown as a
// tooltip (tooltips never appear on touch screens or to screen readers).
let announcer: HTMLElement | null = null;
function announce(message: string): void {
  if (!announcer) {
    announcer = document.createElement("p");
    announcer.className = "sr-only";
    announcer.setAttribute("aria-live", "polite");
    document.body.append(announcer);
  }
  announcer.textContent = "";
  window.setTimeout(() => { if (announcer) announcer.textContent = message; }, 50);
}

function buttonsFor(projectId: string): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(`[data-like="${CSS.escape(projectId)}"]`),
  );
}

function render(projectId: string, state: { liked: boolean; likes?: number }): void {
  for (const button of buttonsFor(projectId)) {
    button.setAttribute("aria-pressed", String(state.liked));
    const count = button.querySelector("[data-like-count]");
    if (count && state.likes !== undefined) count.textContent = String(state.likes);
  }
}

/** Restores pressed state for buttons under `root` (call after inserting HTML). */
export function paintLikes(root: ParentNode = document): void {
  root.querySelectorAll<HTMLButtonElement>("[data-like]").forEach((button) => {
    button.setAttribute("aria-pressed", String(liked.has(button.dataset.like ?? "")));
  });
}

async function toggle(button: HTMLButtonElement): Promise<void> {
  const projectId = button.dataset.like;
  if (!projectId || button.dataset.busy === "true") return;

  const next = !liked.has(projectId);
  const countEl = button.querySelector("[data-like-count]");
  const previousCount = Number(countEl?.textContent ?? "0") || 0;

  // Optimistic update; rolled back if the server says no.
  button.dataset.busy = "true";
  render(projectId, { liked: next, likes: Math.max(0, previousCount + (next ? 1 : -1)) });

  try {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/like`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ liked: next }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; liked?: boolean; likes?: number; error?: string }
      | null;
    if (!response.ok || !data?.ok || typeof data.liked !== "boolean") {
      throw new Error(data?.error ?? "No se pudo registrar tu voto.");
    }
    if (data.liked) liked.add(projectId);
    else liked.delete(projectId);
    writeLiked(liked);
    render(projectId, { liked: data.liked, likes: data.likes });
    button.removeAttribute("title");
  } catch (error) {
    render(projectId, { liked: !next, likes: previousCount });
    const message = error instanceof Error ? error.message : "No se pudo registrar tu voto.";
    button.title = message;
    announce(message);
  } finally {
    delete button.dataset.busy;
  }
}

document.addEventListener("click", (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-like]");
  if (button) void toggle(button);
});

paintLikes();
