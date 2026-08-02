import { describe, it } from "node:test";
import { strictEqual } from "node:assert";
import { convertAttributeName } from "../src/attributes.ts";

describe("convertAttributeName", () => {
  describe("event handler transform", () => {
    it("onclick → onClick", () => {
      strictEqual(convertAttributeName("onclick"), "onClick");
    });

    it("onmouseup → onMouseUp", () => {
      strictEqual(convertAttributeName("onmouseup"), "onMouseUp");
    });

    it("onmouseover → onMouseOver", () => {
      strictEqual(convertAttributeName("onmouseover"), "onMouseOver");
    });

    it("onkeydown → onKeyDown", () => {
      strictEqual(convertAttributeName("onkeydown"), "onKeyDown");
    });

    it("ontouchstart → onTouchStart", () => {
      strictEqual(convertAttributeName("ontouchstart"), "onTouchStart");
    });

    it("onanimationend → onAnimationEnd", () => {
      strictEqual(convertAttributeName("onanimationend"), "onAnimationEnd");
    });

    it("ontransitionend → onTransitionEnd", () => {
      strictEqual(convertAttributeName("ontransitionend"), "onTransitionEnd");
    });

    it("oncompositionupdate → onCompositionUpdate", () => {
      strictEqual(
        convertAttributeName("oncompositionupdate"),
        "onCompositionUpdate",
      );
    });

    it("ongotpointercapture → onGotPointerCapture", () => {
      strictEqual(
        convertAttributeName("ongotpointercapture"),
        "onGotPointerCapture",
      );
    });

    it("oncontextmenu → onContextMenu", () => {
      strictEqual(convertAttributeName("oncontextmenu"), "onContextMenu");
    });

    it("onfocus → onFocus (single-word)", () => {
      strictEqual(convertAttributeName("onfocus"), "onFocus");
    });

    it("onblur → onBlur (single-word)", () => {
      strictEqual(convertAttributeName("onblur"), "onBlur");
    });

    it("ontouchcancel → onTouchCancel", () => {
      strictEqual(convertAttributeName("ontouchcancel"), "onTouchCancel");
    });

    it("onscrollend → onScrollEnd", () => {
      strictEqual(convertAttributeName("onscrollend"), "onScrollEnd");
    });

    it("onselectstart → onSelectStart", () => {
      strictEqual(convertAttributeName("onselectstart"), "onSelectStart");
    });

    it("oncanplaythrough → onCanPlayThrough", () => {
      strictEqual(convertAttributeName("oncanplaythrough"), "onCanPlayThrough");
    });
  });

  describe("event handler edge cases", () => {
    it("ondblclick → onDoubleClick (static override)", () => {
      strictEqual(convertAttributeName("ondblclick"), "onDoubleClick");
    });

    it("'on' alone passes through (no match)", () => {
      strictEqual(convertAttributeName("on"), "on");
    });

    it("onClick passes through (already camelCase)", () => {
      strictEqual(convertAttributeName("onClick"), "onClick");
    });

    it("onSVGLoad passes through (uppercase letters)", () => {
      strictEqual(convertAttributeName("onSVGLoad"), "onSVGLoad");
    });
  });

  describe("passthrough (no conversion needed)", () => {
    it("panose-1 → panose1 (hyphenated static lookup, not auto-camelCase)", () => {
      strictEqual(convertAttributeName("panose-1"), "panose1");
    });

    it("viewBox stays viewBox", () => {
      strictEqual(convertAttributeName("viewBox"), "viewBox");
    });

    it("d stays d", () => {
      strictEqual(convertAttributeName("d"), "d");
    });

    it("fill stays fill", () => {
      strictEqual(convertAttributeName("fill"), "fill");
    });

    it("stdDeviation stays stdDeviation", () => {
      strictEqual(convertAttributeName("stdDeviation"), "stdDeviation");
    });

    it("data-* attributes pass through", () => {
      strictEqual(convertAttributeName("data-testid"), "data-testid");
    });

    it("aria-* attributes pass through", () => {
      strictEqual(convertAttributeName("aria-hidden"), "aria-hidden");
    });
  });
});
