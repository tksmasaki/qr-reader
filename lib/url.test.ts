import { describe, it, expect } from "vitest";
import { isAllowedImageScheme, isOpenableUrl } from "./url";

describe("isAllowedImageScheme", () => {
  it("allows http and https", () => {
    expect(isAllowedImageScheme("http://example.com/qr.png")).toBe(true);
    expect(isAllowedImageScheme("https://example.com/qr.png")).toBe(true);
  });

  it("allows data: and blob: (page-embedded images)", () => {
    expect(isAllowedImageScheme("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(
      isAllowedImageScheme("blob:https://example.com/550e8400-e29b-41d4")
    ).toBe(true);
  });

  it("rejects unsupported schemes", () => {
    expect(isAllowedImageScheme("file:///etc/passwd")).toBe(false);
    expect(isAllowedImageScheme("ftp://example.com/qr.png")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isAllowedImageScheme("not a url")).toBe(false);
    expect(isAllowedImageScheme("")).toBe(false);
  });
});

describe("isOpenableUrl", () => {
  it("allows http and https", () => {
    expect(isOpenableUrl("http://example.com")).toBe(true);
    expect(isOpenableUrl("https://example.com/path?q=1")).toBe(true);
  });

  it("rejects dangerous and non-navigational schemes", () => {
    expect(isOpenableUrl("javascript:alert(1)")).toBe(false);
    expect(isOpenableUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isOpenableUrl("file:///etc/passwd")).toBe(false);
    expect(isOpenableUrl("blob:https://example.com/uuid")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isOpenableUrl("WIFI:S:mynet;T:WPA;P:pass;;")).toBe(false);
    expect(isOpenableUrl("")).toBe(false);
  });
});
