/**
 * Pure validation for public comments. No accounts exist, so the rules are
 * conservative: short, plain text, at most one link (link drops are the
 * dominant spam pattern), and everything lands as `pending` until moderated.
 */

export const COMMENT_AUTHOR_MAX = 60;
export const COMMENT_BODY_MIN = 3;
export const COMMENT_BODY_MAX = 600;
export const COMMENT_MAX_LINKS = 1;

export type CommentValidation =
  | { ok: true; value: { author: string; body: string } }
  | { ok: false; field: "autor" | "comentario"; message: string };

// A full URL token counts once (the first alternative consumes it), bare
// domains on common spam TLDs count too.
const LINK_PATTERN = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|app|dev|xyz|ru|top)\b/gi;

// Collapses runs of blank lines and trims each line: keeps paragraphs, drops
// layout abuse (walls of newlines) without touching the words.
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function validateComment(input: { autor: string; comentario: string }): CommentValidation {
  const author = input.autor.replace(/\s+/g, " ").trim();
  if (author.length < 2 || author.length > COMMENT_AUTHOR_MAX) {
    return { ok: false, field: "autor", message: `Tu nombre debe tener entre 2 y ${COMMENT_AUTHOR_MAX} caracteres.` };
  }

  const body = tidy(input.comentario);
  if (body.length < COMMENT_BODY_MIN || body.length > COMMENT_BODY_MAX) {
    return {
      ok: false,
      field: "comentario",
      message: `El comentario debe tener entre ${COMMENT_BODY_MIN} y ${COMMENT_BODY_MAX} caracteres.`,
    };
  }
  if ((body.match(LINK_PATTERN) ?? []).length > COMMENT_MAX_LINKS) {
    return { ok: false, field: "comentario", message: "Incluí como máximo un enlace." };
  }

  return { ok: true, value: { author, body } };
}
