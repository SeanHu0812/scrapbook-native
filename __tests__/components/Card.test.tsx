import React from "react";
import { render } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    const { getByText } = render(
      <Card>
        <Text>Card content</Text>
      </Card>
    );
    expect(getByText("Card content")).toBeTruthy();
  });

  it("defaults to white background", () => {
    const { UNSAFE_getByType } = render(
      <Card>
        <Text>hi</Text>
      </Card>
    );
    const card = UNSAFE_getByType(View);
    const flatStyle = [card.props.style].flat();
    expect(flatStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: "#ffffff" }),
      ])
    );
  });

  it("accepts a tint prop and applies a background color", () => {
    const { UNSAFE_getByType } = render(
      <Card tint="pink">
        <Text>hi</Text>
      </Card>
    );
    const card = UNSAFE_getByType(View);
    const flatStyle = [card.props.style].flat();
    const hasBg = flatStyle.some(
      (s: any) => s && typeof s === "object" && "backgroundColor" in s
    );
    expect(hasBg).toBe(true);
  });
});
