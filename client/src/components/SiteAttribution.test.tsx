// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteAttribution } from "./SiteAttribution";

describe("SiteAttribution", () => {
  it("renders the project-controlled long with Manus attribution", () => {
    render(<SiteAttribution />);

    expect(screen.getByTestId("site-attribution").textContent).toContain("long with Manus");
    expect(screen.getByLabelText("站点署名：long with Manus")).toBeTruthy();
  });
});
