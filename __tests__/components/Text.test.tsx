import React from "react";
import { render } from "@testing-library/react-native";
import { Text, HandwriteText } from "@/components/ui/Text";

describe("Text", () => {
  it("renders children", () => {
    const { getByText } = render(<Text>Hello</Text>);
    expect(getByText("Hello")).toBeTruthy();
  });

  it("applies base font family style", () => {
    const { getByText } = render(<Text>Hello</Text>);
    const el = getByText("Hello");
    expect(el.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontFamily: "PatrickHand" }),
      ])
    );
  });
});

describe("HandwriteText", () => {
  it("renders children", () => {
    const { getByText } = render(<HandwriteText>Handwrite</HandwriteText>);
    expect(getByText("Handwrite")).toBeTruthy();
  });

  it("applies handwrite font family style", () => {
    const { getByText } = render(<HandwriteText>Handwrite</HandwriteText>);
    const el = getByText("Handwrite");
    expect(el.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontFamily: "Caveat-Bold" }),
      ])
    );
  });
});
