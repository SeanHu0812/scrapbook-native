import React from "react";
import { render } from "@testing-library/react-native";
import { UserAvatar } from "@/components/ui/UserAvatar";

describe("UserAvatar", () => {
  it("shows initial when no avatar source provided", () => {
    const { getByText } = render(<UserAvatar name="Alice" />);
    expect(getByText("A")).toBeTruthy();
  });

  it("shows '?' when name is empty", () => {
    const { getByText } = render(<UserAvatar name="" />);
    expect(getByText("?")).toBeTruthy();
  });

  it("renders an Image when avatarUrl is provided", () => {
    const { queryByText, UNSAFE_getByType } = render(
      <UserAvatar name="Bob" avatarUrl="https://example.com/avatar.png" />
    );
    expect(queryByText("B")).toBeNull();
    const { Image } = require("react-native");
    expect(UNSAFE_getByType(Image)).toBeTruthy();
  });

  it("applies custom size", () => {
    const { getByText } = render(<UserAvatar name="C" size={32} />);
    const initial = getByText("C");
    expect(initial.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 32 * 0.42 })])
    );
  });
});
