import { describe, expect, it } from "vitest";
import { validateComment } from "../src/lib/engagement/comments";

describe("validateComment", () => {
  it("trims, collapses blank-line walls and keeps paragraphs", () => {
    const result = validateComment({ autor: "  Ana   P ", comentario: " Hola\n\n\n\n  mundo  " });
    expect(result).toEqual({ ok: true, value: { author: "Ana P", body: "Hola\n\nmundo" } });
  });

  it("allows one link but not two", () => {
    expect(validateComment({ autor: "Ana", comentario: "Mira https://demo.app" }).ok).toBe(true);
    expect(validateComment({ autor: "Ana", comentario: "www.a.com y www.b.com" }).ok).toBe(false);
  });

  it("enforces author and body lengths", () => {
    expect(validateComment({ autor: "A", comentario: "Hola hola" })).toMatchObject({ ok: false, field: "autor" });
    expect(validateComment({ autor: "Ana", comentario: "x".repeat(601) })).toMatchObject({ ok: false, field: "comentario" });
  });
});
