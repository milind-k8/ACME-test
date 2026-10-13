import { beforeEach, describe, expect, it } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { navigate, usePath } from "./router";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("usePath / navigate", () => {
  it("follows navigate()", () => {
    const { result } = renderHook(() => usePath());
    expect(result.current).toBe("/");

    act(() => {
      navigate("/employees");
    });

    expect(result.current).toBe("/employees");
    expect(window.location.pathname).toBe("/employees");
  });

  it("drops the previous page's query string", () => {
    window.history.replaceState(null, "", "/employees?country=IN");

    navigate("/");

    expect(window.location.search).toBe("");
  });

  it("follows the browser's Back button", async () => {
    const { result } = renderHook(() => usePath());
    act(() => {
      navigate("/employees");
    });

    act(() => {
      window.history.back();
    });

    await waitFor(() => {
      expect(result.current).toBe("/");
    });
  });
});
