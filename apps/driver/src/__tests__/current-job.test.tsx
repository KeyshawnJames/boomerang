import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import { Alert, type AlertButton, Linking } from "react-native";

import { queryClient } from "../api";
import RootLayout from "../app/_layout";
import Home from "../app/index";
import Login from "../app/login";
import i18n from "../i18n";
import { useSession } from "../session";

const routes = { _layout: RootLayout, index: Home, login: Login };
const driver = {
  id: "1",
  role: "driver",
  name: "Brad",
  email: "brad@example.com",
  is_approved: true,
};
// Today 4–6 p.m. in Montreal (EST, UTC-5); "now" is noon the same day.
const mine = {
  id: "job-1",
  status: "driver_assigned",
  pickup_address: "206 Av. Stream, Dorval, QC H9S 2P1, Canada",
  pickup_notes: "Side door",
  client_first_name: "Sam",
  client_phone: "+15145550123",
  pickup_window_start: "2026-11-05T21:00:00Z",
  pickup_window_end: "2026-11-05T23:00:00Z",
  carrier: "canada_post",
  label_type: "qr_code",
  carrier_tracking_number: null,
  arrived_at: null,
  label_image_url: "http://api/uploads/label.jpg?token=x",
  package_photo_url: "http://api/uploads/package.jpg?token=x",
};

type Reply = [status: number, body: unknown];
let replies: Record<string, Reply>;
const fetchMock = jest.spyOn(globalThis, "fetch");
const openURL = jest.spyOn(Linking, "openURL");
const alert = jest.spyOn(Alert, "alert");

const path = (input: unknown) => new URL((input as Request).url).pathname;
const posted = (p: string) =>
  fetchMock.mock.calls.some(
    ([input]) => path(input) === p && (input as Request).method === "POST",
  );

beforeEach(() => {
  jest.useFakeTimers({
    advanceTimers: true,
    now: new Date("2026-11-05T17:00:00Z"),
  });
  i18n.changeLanguage("en");
  useSession.getState().signIn("tok");
  replies = {
    "/me": [200, driver],
    "/driver/jobs/mine": [200, [mine]],
    "/driver/jobs": [200, []],
  };
  fetchMock.mockClear();
  fetchMock.mockImplementation(async (input) => {
    const [status, body] = replies[path(input)];
    return status === 204
      ? new Response(null, { status })
      : Response.json(body, { status });
  });
  openURL.mockReset().mockResolvedValue();
  alert.mockReset();
});

afterEach(async () => {
  queryClient.clear();
  await useSession.getState().signOut();
  jest.useRealTimers();
});

test("a driver with a job in progress opens on it", async () => {
  await renderRouter(routes);
  expect(await screen.findByText(mine.pickup_address)).toBeTruthy();
  expect(screen.getByText("Today, 4:00 p.m. – 6:00 p.m.")).toBeTruthy();
  expect(screen.getByText("Side door")).toBeTruthy();
  expect(screen.getByText("Client: Sam")).toBeTruthy();
  expect(screen.getByText("Canada Post · QR code")).toBeTruthy();
  expect(screen.getByLabelText("Package photo").props.source).toEqual({
    uri: mine.package_photo_url,
  });
  expect(screen.queryByText("Jobs")).toBeNull();
});

test("Call opens the phone app and Open in Maps opens directions", async () => {
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Call Sam" }),
  );
  expect(openURL).toHaveBeenCalledWith("tel:+15145550123");
  await fireEvent.press(screen.getByRole("button", { name: "Open in Maps" }));
  expect(openURL).toHaveBeenLastCalledWith(
    `https://maps.apple.com/?daddr=${encodeURIComponent(mine.pickup_address)}`,
  );
});

test("I've arrived saves the time and shows it", async () => {
  replies["/driver/jobs/job-1/arrived"] = [204, null];
  await renderRouter(routes);
  const arrive = await screen.findByRole("button", { name: "I've arrived" });
  replies["/driver/jobs/mine"] = [
    200,
    [{ ...mine, arrived_at: "2026-11-05T21:05:00Z" }],
  ];
  await fireEvent.press(arrive);
  expect(await screen.findByText("You arrived at 4:05 p.m.")).toBeTruthy();
  expect(posted("/driver/jobs/job-1/arrived")).toBe(true);
  expect(screen.queryByRole("button", { name: "I've arrived" })).toBeNull();
});

const handBackButtons = () => alert.mock.calls[0][2] as AlertButton[];

test("handing the job back asks first, then shows the job list", async () => {
  replies["/driver/jobs/job-1/release"] = [204, null];
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Hand this job back" }),
  );
  expect(alert.mock.calls[0][0]).toBe("Hand this job back?");
  expect(posted("/driver/jobs/job-1/release")).toBe(false);

  handBackButtons().find((b) => b.style === "destructive")!.onPress!();
  expect(
    await screen.findByText("No jobs right now. Pull down to refresh."),
  ).toBeTruthy();
  expect(posted("/driver/jobs/job-1/release")).toBe(true);
});

test("keeping the job sends nothing", async () => {
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Hand this job back" }),
  );
  expect(handBackButtons().find((b) => b.style === "cancel")).toBeTruthy();
  expect(posted("/driver/jobs/job-1/release")).toBe(false);
});

test("a refused hand-back shows the server's message", async () => {
  replies["/driver/jobs/job-1/release"] = [
    409,
    { detail: "This job isn't waiting for pickup anymore." },
  ];
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Hand this job back" }),
  );
  handBackButtons().find((b) => b.style === "destructive")!.onPress!();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This job isn't waiting for pickup anymore.",
  );
});

test("the job reads in French", async () => {
  i18n.changeLanguage("fr");
  await renderRouter(routes);
  expect(await screen.findByText("Client : Sam")).toBeTruthy();
  expect(screen.getByText("Postes Canada · Code QR")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Je suis sur place" }),
  ).toBeTruthy();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Rendre cette course" }),
    ).toBeTruthy(),
  );
});
