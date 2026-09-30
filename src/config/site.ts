/**
 * Single source of truth for outbound site links, so copy changes never hunt
 * through markup. `PUBLIC_*` values are safe to ship to the browser.
 */

/**
 * Community sign-up form (Tally / Typeform / Google Form). Until it is set
 * the CTAs fall back to the in-page "¿Qué es ASILO Builders?" section.
 */
export const COMMUNITY_JOIN_URL: string =
  import.meta.env.PUBLIC_COMMUNITY_JOIN_URL || "#unete";

/** Link attributes for the join CTA: external forms open in a new tab. */
export const joinLinkAttrs = COMMUNITY_JOIN_URL.startsWith("http")
  ? { href: COMMUNITY_JOIN_URL, target: "_blank", rel: "noopener noreferrer" }
  : { href: COMMUNITY_JOIN_URL };
