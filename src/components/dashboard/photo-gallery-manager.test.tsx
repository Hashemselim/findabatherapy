import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PhotoGalleryManager } from "@/components/dashboard/photo-gallery-manager";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imgProps = { ...props };
    delete imgProps.fill;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={typeof imgProps.alt === "string" ? imgProps.alt : ""} {...imgProps} />;
  },
}));

vi.mock("@/lib/storage/actions", () => ({
  getPhotos: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
  reorderPhotos: vi.fn(),
}));

describe("PhotoGalleryManager", () => {
  it("keeps photo gallery editing available for free users", () => {
    render(<PhotoGalleryManager planTier="free" isDemo />);

    expect(screen.getByText("Photo Gallery")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Photos" })).toBeInTheDocument();
    expect(screen.queryByText("Upgrade Now")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByText("Edit Photo Gallery")).toBeInTheDocument();
    expect(screen.getByText("0 of 3 photos used")).toBeInTheDocument();
  });
});
