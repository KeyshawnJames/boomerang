import { fireEvent, renderRouter, screen } from "expo-router/testing-library";
import * as SecureStore from "expo-secure-store";

import { queryClient } from "../api";
import RootLayout from "../app/_layout";
import Home from "../app/index";
import Login from "../app/login";
import Register from "../app/register";
import i18n from "../i18n";
import { useSession } from "../session";

const routes = {
  _layout: RootLayout,
  index: Home,
  login: Login,
  register: Register,
};
const driver = {
  id: "1",
  role: "driver",
  name: "Alex",
  email: "alex@example.com",
  is_approved: false,
};

type Reply = [status: number, body: unknown];
let replies: Record<string, Reply>;
const fetchMock = jest.spyOn(globalThis, "fetch");

beforeEach(async () => {
  i18n.changeLanguage("en");
  await useSession.getState().signOut();
  replies = {
    "/me": [200, driver],
    "/auth/login": [200, { access_token: "tok", token_type: "bearer" }],
    "/auth/register": [201, driver],
    "/driver/jobs/mine": [200, []],
    "/driver/jobs": [200, []],
  };
  fetchMock.mockClear();
  // A fresh Response per call: a body can only be read once.
  fetchMock.mockImplementation(async (input) => {
    const [status, body] = replies[new URL((input as Request).url).pathname];
    return Response.json(body, { status });
  });
});

afterEach(() => {
  queryClient.clear();
  queryClient.setDefaultOptions({});
});

function requestTo(path: string): Request {
  const call = fetchMock.mock.calls.find(
    ([input]) => new URL((input as Request).url).pathname === path,
  );
  return call![0] as Request;
}

async function logIn() {
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    " alex@example.com ",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Password"),
    "correct-horse",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Log in" }));
}

test("signed out, the app opens on the login screen", async () => {
  await renderRouter(routes);
  expect(screen.getByText("Welcome back")).toBeTruthy();
});

test("logging in saves the token and asks who the driver is", async () => {
  await renderRouter(routes);
  await logIn();
  expect(await screen.findByText("Waiting for approval")).toBeTruthy();
  expect(SecureStore.getItem("token")).toBe("tok");
  expect(await requestTo("/auth/login").json()).toEqual({
    email: "alex@example.com",
    password: "correct-horse",
  });
  expect(requestTo("/me").headers.get("Authorization")).toBe("Bearer tok");
});

test("registering creates a driver account, then logs in", async () => {
  await renderRouter(routes);
  await fireEvent.press(
    screen.getByRole("link", { name: "No account? Sign up" }),
  );
  await fireEvent.changeText(screen.getByLabelText("Name"), "Alex");
  await fireEvent.changeText(
    screen.getByLabelText("Email"),
    "alex@example.com",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Password"),
    "correct-horse",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Sign up" }));
  expect(await screen.findByText("Waiting for approval")).toBeTruthy();
  expect(await requestTo("/auth/register").json()).toEqual({
    role: "driver",
    name: "Alex",
    email: "alex@example.com",
    password: "correct-horse",
    locale: "en",
  });
  expect(SecureStore.getItem("token")).toBe("tok");
});

test("a wrong password shows the API's message, in the app's language", async () => {
  replies["/auth/login"] = [401, { detail: "Incorrect email or password." }];
  await renderRouter(routes);
  await logIn();
  expect(await screen.findByText("Incorrect email or password.")).toBeTruthy();
  expect(requestTo("/auth/login").headers.get("Accept-Language")).toBe("en");
});

test("validation errors show the app's own French text", async () => {
  i18n.changeLanguage("fr");
  replies["/auth/register"] = [
    422,
    {
      detail: [
        {
          loc: ["body", "password"],
          msg: "String should have at least 8 characters",
          type: "string_too_short",
        },
      ],
    },
  ];
  await renderRouter(routes, { initialUrl: "/register" });
  await fireEvent.press(screen.getByRole("button", { name: "S'inscrire" }));
  expect(
    await screen.findByText(
      "Votre mot de passe doit contenir de 8 à 128 caractères.",
    ),
  ).toBeTruthy();
});

test("an unreachable server shows a generic message", async () => {
  fetchMock.mockImplementation(async () => {
    throw new TypeError("Network request failed");
  });
  await renderRouter(routes);
  await logIn();
  expect(
    await screen.findByText(
      "Something went wrong. Check your connection and try again.",
    ),
  ).toBeTruthy();
});

test("an expired token signs the driver out", async () => {
  useSession.getState().signIn("tok");
  replies["/me"] = [
    401,
    { detail: "You are not signed in, or your session has expired." },
  ];
  await renderRouter(routes);
  expect(await screen.findByText("Welcome back")).toBeTruthy();
  expect(SecureStore.getItem("token")).toBeNull();
});

test("logging out from the waiting screen forgets the token", async () => {
  useSession.getState().signIn("tok");
  await renderRouter(routes);
  await fireEvent.press(await screen.findByRole("button", { name: "Log out" }));
  expect(await screen.findByText("Welcome back")).toBeTruthy();
  expect(SecureStore.getItem("token")).toBeNull();
});

test("an approved driver opens on the jobs screen", async () => {
  useSession.getState().signIn("tok");
  replies["/me"] = [200, { ...driver, is_approved: true }];
  await renderRouter(routes);
  expect(await screen.findByText("Jobs")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Log out" }));
  expect(await screen.findByText("Welcome back")).toBeTruthy();
});

test("Refresh after approval opens the jobs screen", async () => {
  useSession.getState().signIn("tok");
  await renderRouter(routes);
  await fireEvent.press(await screen.findByRole("button", { name: "Refresh" }));
  expect(await screen.findByText("Waiting for approval")).toBeTruthy();
  replies["/me"] = [200, { ...driver, is_approved: true }];
  await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByText("Jobs")).toBeTruthy();
});

test("a failed Refresh says so and keeps the driver waiting", async () => {
  // The app retries a failed query 3 times over ~7 s; skip that wait here.
  queryClient.setDefaultOptions({ queries: { retry: false } });
  useSession.getState().signIn("tok");
  await renderRouter(routes);
  await screen.findByText("Waiting for approval");
  fetchMock.mockImplementation(async () => {
    throw new TypeError("Network request failed");
  });
  await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
  expect(
    await screen.findByText(
      "Something went wrong. Check your connection and try again.",
    ),
  ).toBeTruthy();
  expect(screen.getByText("Waiting for approval")).toBeTruthy();
});

test("a client account is told it can't drive, with nothing to refresh", async () => {
  useSession.getState().signIn("tok");
  replies["/me"] = [200, { ...driver, role: "client", is_approved: null }];
  await renderRouter(routes);
  expect(
    await screen.findByText(
      "This is a client account. Sign up with another email to drive with Boomerang.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Waiting for approval")).toBeNull();
  expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
});

test("a failed first load doesn't claim the driver is waiting", async () => {
  queryClient.setDefaultOptions({ queries: { retry: false } });
  useSession.getState().signIn("tok");
  fetchMock.mockImplementation(async () => {
    throw new TypeError("Network request failed");
  });
  await renderRouter(routes);
  expect(
    await screen.findByText(
      "Something went wrong. Check your connection and try again.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Waiting for approval")).toBeNull();
  replies["/me"] = [200, { ...driver, is_approved: true }];
  fetchMock.mockImplementation(async (input) => {
    const [status, body] = replies[new URL((input as Request).url).pathname];
    return Response.json(body, { status });
  });
  await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByText("Jobs")).toBeTruthy();
});

test("the chosen language is saved on the device", async () => {
  await renderRouter(routes);
  await fireEvent.press(
    screen.getByRole("button", { name: "Français, switch to French" }),
  );
  expect(screen.getByText("Bon retour")).toBeTruthy();
  expect(SecureStore.getItem("language")).toBe("fr");
});
