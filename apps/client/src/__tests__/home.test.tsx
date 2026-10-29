import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import "../api";
import Home from "../app/index";
import i18n from "../i18n";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    // gcTime: Infinity leaves no cache timers running, so Jest can exit.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const fetchMock = jest.spyOn(globalThis, "fetch");

beforeEach(() => {
  i18n.changeLanguage("en");
  fetchMock.mockClear();
  // A fresh Response per call: a body can only be read once.
  fetchMock.mockImplementation(async () =>
    Response.json({ status: "ok", database: "ok" }),
  );
});

test("renders the home screen and reaches the server", async () => {
  await render(<Home />, { wrapper });
  expect(screen.getByText("Boomerang")).toBeTruthy();
  expect(screen.getByText("Returns, picked up.")).toBeTruthy();
  expect(await screen.findByText("Server connected")).toBeTruthy();
  const request = fetchMock.mock.calls[0][0] as Request;
  expect(request.url).toBe("http://localhost:8000/health");
});

test("the language toggle switches to French and back", async () => {
  await render(<Home />, { wrapper });
  await fireEvent.press(
    screen.getByRole("button", { name: "Français, switch to French" }),
  );
  expect(screen.getByText("Vos retours, cueillis à domicile.")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "English, passer à l'anglais" }),
  );
  expect(screen.getByText("Returns, picked up.")).toBeTruthy();
});

test("shows the server is unreachable when /health fails", async () => {
  fetchMock.mockImplementation(async () =>
    Response.json({ status: "error" }, { status: 503 }),
  );
  await render(<Home />, { wrapper });
  expect(await screen.findByText("Server unreachable")).toBeTruthy();
});
