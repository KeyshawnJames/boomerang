import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { queryClient } from "../api";
import RootLayout from "../app/_layout";
import Home from "../app/index";
import Job from "../app/job";
import Login from "../app/login";
import i18n from "../i18n";
import { useSession } from "../session";

const routes = { _layout: RootLayout, index: Home, login: Login, job: Job };
const driver = {
  id: "1",
  role: "driver",
  name: "Alex",
  email: "alex@example.com",
  is_approved: true,
};
// Today 4–6 p.m. in Montreal (EST, UTC-5); "now" is noon the same day.
const job = {
  id: "job-1",
  postal_area: "H2T",
  pickup_window_start: "2026-11-05T21:00:00Z",
  pickup_window_end: "2026-11-05T23:00:00Z",
  carrier: "canada_post",
  label_type: "printed_label",
  driver_payout: 474,
};

type Reply = [status: number, body: unknown];
let replies: Record<string, Reply>;
const fetchMock = jest.spyOn(globalThis, "fetch");

function reply(input: unknown) {
  const [status, body] = replies[new URL((input as Request).url).pathname];
  return status === 204
    ? new Response(null, { status })
    : Response.json(body, { status });
}

beforeEach(() => {
  // Timers still run; only the clock is pinned, so "Today" is stable.
  jest.useFakeTimers({
    advanceTimers: true,
    now: new Date("2026-11-05T17:00:00Z"),
  });
  i18n.changeLanguage("en");
  useSession.getState().signIn("tok");
  replies = { "/me": [200, driver], "/driver/jobs": [200, [job]] };
  fetchMock.mockClear();
  fetchMock.mockImplementation(async (input) => reply(input));
});

afterEach(async () => {
  queryClient.clear();
  queryClient.setDefaultOptions({});
  await useSession.getState().signOut();
  jest.useRealTimers();
});

const jobListCalls = () =>
  fetchMock.mock.calls.filter(
    ([input]) => new URL((input as Request).url).pathname === "/driver/jobs",
  ).length;

test("an approved driver sees each open job as a card", async () => {
  await renderRouter(routes);
  expect(await screen.findByText("H2T")).toBeTruthy();
  expect(screen.getByText("Today, 4:00 p.m. – 6:00 p.m.")).toBeTruthy();
  expect(screen.getByText("Canada Post · Printed label")).toBeTruthy();
  expect(screen.getByText("You earn $4.74")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Accept" })).toBeTruthy();
});

test("no open jobs says so", async () => {
  replies["/driver/jobs"] = [200, []];
  await renderRouter(routes);
  expect(
    await screen.findByText("No jobs right now. Pull down to refresh."),
  ).toBeTruthy();
});

test("pulling down fetches the list again", async () => {
  replies["/driver/jobs"] = [200, []];
  await renderRouter(routes);
  await screen.findByText("No jobs right now. Pull down to refresh.");
  replies["/driver/jobs"] = [200, [job]];
  await fireEvent(screen.getByTestId("jobs"), "refresh");
  expect(await screen.findByText("H2T")).toBeTruthy();
  expect(jobListCalls()).toBe(2);
});

test("the cards read in French", async () => {
  i18n.changeLanguage("fr");
  await renderRouter(routes);
  expect(
    await screen.findByText("Postes Canada · Étiquette imprimée"),
  ).toBeTruthy();
  expect(screen.getByText("Vous gagnez 4,74 $")).toBeTruthy();
  expect(screen.getByText("Aujourd'hui, 16 h 00 – 18 h 00")).toBeTruthy();
});

const acceptPath = "/driver/jobs/job-1/accept";

test("accepting a job opens the current job", async () => {
  replies[acceptPath] = [204, null];
  await renderRouter(routes);
  await fireEvent.press(await screen.findByRole("button", { name: "Accept" }));
  expect(await screen.findByText("Your job")).toBeTruthy();
  const call = fetchMock.mock.calls.find(
    ([input]) => new URL((input as Request).url).pathname === acceptPath,
  );
  expect((call![0] as Request).method).toBe("POST");
});

test("a job someone else took says so and refreshes the list", async () => {
  replies[acceptPath] = [409, { detail: "This job was just taken." }];
  await renderRouter(routes);
  const accept = await screen.findByRole("button", { name: "Accept" });
  replies["/driver/jobs"] = [200, []];
  await fireEvent.press(accept);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This job was just taken.",
  );
  expect(
    await screen.findByText("No jobs right now. Pull down to refresh."),
  ).toBeTruthy();
  expect(screen.queryByText("Your job")).toBeNull();
});

test("already being on a job shows the server's message", async () => {
  replies[acceptPath] = [
    409,
    { detail: "Finish your current job before accepting another." },
  ];
  await renderRouter(routes);
  await fireEvent.press(await screen.findByRole("button", { name: "Accept" }));
  expect(
    await screen.findByText(
      "Finish your current job before accepting another.",
    ),
  ).toBeTruthy();
});

test("every Accept is disabled while one is sending", async () => {
  replies["/driver/jobs"] = [200, [job, { ...job, id: "job-2" }]];
  fetchMock.mockImplementation(async (input) =>
    new URL((input as Request).url).pathname === acceptPath
      ? new Promise<Response>(() => {})
      : reply(input),
  );
  await renderRouter(routes);
  const [first] = await screen.findAllByRole("button", { name: "Accept" });
  await fireEvent.press(first);
  await waitFor(() => {
    for (const button of screen.getAllByRole("button", { name: "Accept" }))
      expect(button).toBeDisabled();
  });
});

test("a network failure on accept shows the generic message", async () => {
  await renderRouter(routes);
  const accept = await screen.findByRole("button", { name: "Accept" });
  fetchMock.mockImplementation(async () => {
    throw new TypeError("Network request failed");
  });
  await fireEvent.press(accept);
  expect(
    await screen.findByText(
      "Something went wrong. Check your connection and try again.",
    ),
  ).toBeTruthy();
});
