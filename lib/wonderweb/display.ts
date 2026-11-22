/**
 * File: lib/wonderweb/display.ts
 * Purpose: Client-safe description of the fictional WonderWeb pages as they appear in-game
 *          (address bar text and a short mock), used for the placeholder in-world screen and the
 *          HUD browser panel until a live Solari screenshot replaces it. All names are fictional
 *          `.wonder` sites; nothing imitates a real company.
 * Date: 2026-11-21
 */
export interface DisplayPage {
  readonly url: string;
  readonly title: string;
  readonly lines: readonly string[];
  readonly cta: string;
  readonly field: string;
}

export const REAL_SHOP_HOST = "queensroyalshop.wonder";
export const FAKE_SHOP_HOST = "royal-crowns-free.wonder";

export const FREE_CROWN_PAGE: DisplayPage = {
  url: `https://${FAKE_SHOP_HOST}/claim`,
  title: "👑 The Queen's Royal Shop",
  lines: ["FREE golden crowns today only!", "Only 9 left — hurry!!!"],
  field: "Your Royal ID",
  cta: "CLAIM MY CROWN",
};

export const CROWN_SHOP_PAGE: DisplayPage = {
  url: `https://${REAL_SHOP_HOST}/`,
  title: "👑 The Queen's Royal Shop",
  lines: ["Crowns, sceptres and tea sets.", "Crowns from 40 royal pennies."],
  field: "Search the shop",
  cta: "SEARCH",
};

export function displayPageFor(url: string): DisplayPage {
  return url.includes(REAL_SHOP_HOST) ? CROWN_SHOP_PAGE : FREE_CROWN_PAGE;
}
