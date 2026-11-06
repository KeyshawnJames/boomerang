import { act, renderRouter, screen } from "expo-router/testing-library";

import { queryClient } from "../api";
import RootLayout from "../app/_layout";
import Home from "../app/index";
import Booked from "../app/returns/[id]";
import i18n from "../i18n";
import { useSession } from "../session";

const routes = { _layout: RootLayout, index: Home, "returns/[id]": Booked };
const RETURN = {
  id: "ret1",
  status: "requested",
  retailer_id: "r1",
  carrier: "canada_post",
  label_type: "printed_label",
  order_number: null,
  pickup_address: "1 Rue Sainte-Catherine O, Montréal, QC H3B 1A1",
  pickup_notes: null,
  pickup_window_start: "2026-10-31T16:00:00-04:00",
  pickup_window_end: "2026-10-31T18:00:00-04:00",
  pickup_fee: 499,
  eligibility_outcome: "eligible",
  created_at: "2026-10-31T14:07:00-04:00",
  carrier_tracking_number: null,
  driver_first_name: null,
  dropoff_location_name: null,
};
const DRIVER = { driver_first_name: "Alex" };
// Saved at pickup for a printed label, shown only once dropped off.
const DROPPED = {
  ...DRIVER,
  carrier_tracking_number: "1Z999",
  dropoff_location_name: "Postes Canada Mile End",
};

let current: object;
const fetchMock = jest.spyOn(globalThis, "fetch");

beforeEach(() => {
  i18n.changeLanguage("en");
  useSession.getState().signIn("tok");
  current = RETURN;
  fetchMock.mockImplementation(async (input) => {
    const path = new URL((input as Request).url).pathname;
    if (path === "/returns/ret1") return Response.json(current);
    if (path === "/me")
      return Response.json({ id: "u1", role: "client", name: "Ada" });
    return Response.json([]);
  });
});

beforeAll(() => queryClient.setDefaultOptions({ queries: { retry: false } }));
afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
});

const open = (changes: object) => {
  current = { ...RETURN, ...changes };
  return renderRouter(routes, { initialUrl: "/returns/ret1" });
};

test.each([
  ["requested", {}, "Looking for a driver"],
  ["driver_assigned", DRIVER, "Alex is on the way"],
  ["picked_up", { ...DRIVER, carrier_tracking_number: "1Z999" }, "Picked up"],
  ["dropped_off", DROPPED, "Dropped off at Canada Post"],
  ["completed", DROPPED, "Completed"],
  ["cancelled", {}, "Cancelled"],
  ["failed_dropoff", DROPPED, "Drop-off failed: we'll call you"],
])("%s", async (status, changes, text) => {
  await open({ status, ...changes });
  expect(await screen.findByText(text)).toBeTruthy();
  const droppedOff = status === "dropped_off" || status === "completed";
  expect(!!screen.queryByText("1Z999")).toBe(droppedOff);
  expect(!!screen.queryByText("Postes Canada Mile End")).toBe(droppedOff);
});

test("says it in French", async () => {
  i18n.changeLanguage("fr");
  await open({ status: "driver_assigned", ...DRIVER });
  expect(await screen.findByText("Alex est en route")).toBeTruthy();
});

test("a handed-back job shows Looking for a driver again", async () => {
  jest.useFakeTimers();
  await open({ status: "driver_assigned", ...DRIVER });
  expect(await screen.findByText("Alex is on the way")).toBeTruthy();

  current = RETURN;
  await act(() => jest.advanceTimersByTimeAsync(15_000));

  expect(await screen.findByText("Looking for a driver")).toBeTruthy();
  expect(screen.queryByText("Alex is on the way")).toBeNull();
});

test("stops refreshing once the return is final", async () => {
  jest.useFakeTimers();
  await open({ status: "completed", ...DROPPED });
  expect(await screen.findByText("Completed")).toBeTruthy();
  const calls = () =>
    fetchMock.mock.calls.filter(([input]) =>
      (input as Request).url.endsWith("/returns/ret1"),
    ).length;
  const before = calls();

  await act(() => jest.advanceTimersByTimeAsync(60_000));

  expect(calls()).toBe(before);
});
