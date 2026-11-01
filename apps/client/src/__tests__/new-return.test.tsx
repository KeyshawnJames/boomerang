import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { eligibilityQuestionsQueryKey } from "api/react-query";

import { queryClient } from "../api";
import RootLayout from "../app/_layout";
import Home from "../app/index";
import NewReturnLayout from "../app/new-return/_layout";
import Retailer from "../app/new-return/index";
import Label from "../app/new-return/label";
import Blocked from "../app/new-return/blocked";
import Eligibility from "../app/new-return/eligibility";
import Photos from "../app/new-return/photos";
import Address from "../app/new-return/address";
import Time from "../app/new-return/time";
import Review from "../app/new-return/review";
import Booked from "../app/returns/[id]";
import { bookingOptionsQuery, slotLabel } from "../booking";
import { useDraft } from "../draft";
import i18n from "../i18n";
import { useSession } from "../session";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const picker = jest.mocked(ImagePicker);

const routes = {
  _layout: RootLayout,
  index: Home,
  "new-return/_layout": NewReturnLayout,
  "new-return/index": Retailer,
  "new-return/label": Label,
  "new-return/photos": Photos,
  "new-return/eligibility": Eligibility,
  "new-return/blocked": Blocked,
  "new-return/address": Address,
  "new-return/time": Time,
  "new-return/review": Review,
  "returns/[id]": Booked,
};
const UPLOAD_URL = "http://localhost:8000/uploads/u1/label/abc.png?token=t";

const ADDRESS = "1 Rue Sainte-Catherine O, Montréal, QC H3B 1A1";
const ASAP = {
  start: "2026-10-31T14:07:00-04:00",
  end: "2026-10-31T16:07:00-04:00",
  asap: true,
};
const SLOT = {
  start: "2026-10-31T16:00:00-04:00",
  end: "2026-10-31T18:00:00-04:00",
  asap: false,
};
const BOOKED = {
  id: "ret1",
  status: "awaiting_payment",
  retailer_id: "r1",
  carrier: "canada_post",
  label_type: "qr_code",
  order_number: "A-123",
  pickup_address: ADDRESS,
  pickup_notes: null,
  pickup_window_start: SLOT.start,
  pickup_window_end: SLOT.end,
  pickup_fee: 499,
  eligibility_outcome: "eligible",
  created_at: "2026-10-31T14:07:00-04:00",
};

type Reply = [status: number, body: unknown];
let replies: Record<string, Reply>;
const fetchMock = jest.spyOn(globalThis, "fetch");

function urlOf(input: Parameters<typeof fetch>[0]): string {
  return typeof input === "string" ? input : (input as Request).url;
}

beforeEach(() => {
  i18n.changeLanguage("en");
  useSession.getState().signIn("tok");
  replies = {
    "/health": [200, { status: "ok", database: "ok" }],
    "/me": [200, { id: "u1", role: "client", name: "Ada", email: "a@b.ca" }],
    "/retailers": [
      200,
      [
        { id: "r1", name: "Simons", logo_url: null, return_policy_url: null },
        { id: "r2", name: "Zara", logo_url: null, return_policy_url: null },
      ],
    ],
    "/addresses/autocomplete": [
      200,
      [{ place_id: "p1", text: "1 Rue Sainte-Catherine O, Montréal" }],
    ],
    "/addresses/resolve": [200, { address: ADDRESS, token: "addr-tok" }],
    "/booking/options": [200, { pickup_fee: 499, slots: [ASAP, SLOT] }],
    "/returns": [201, BOOKED],
    "/returns/ret1": [200, BOOKED],
    "/uploads/presign": [200, { key: "u1/label/abc.png", url: UPLOAD_URL }],
    "/uploads/u1/label/abc.png": [204, null],
    "/eligibility/questions": [
      200,
      {
        policy_version: 3,
        questions: [
          {
            code: "sealed",
            prompt: "Is it sealed?",
            help: "Taped shut, ready to ship.",
            options: [
              { value: "yes", label: "Yes", outcome: "pass" },
              { value: "no", label: "No", outcome: "block" },
              { value: "not_sure", label: "Not sure", outcome: "warn" },
            ],
          },
          {
            code: "label_ready",
            prompt: "Do you have the label?",
            help: null,
            options: [
              { value: "yes", label: "Yes", outcome: "pass" },
              { value: "no", label: "No", outcome: "block" },
            ],
          },
        ],
      },
    ],
  };
  jest.clearAllMocks();
  // A fresh Response per call: a body can only be read once.
  fetchMock.mockImplementation(async (input) => {
    const url = urlOf(input);
    // The picked photo, read from the device.
    if (url.startsWith("file://")) return new Response("photo-bytes");
    const [status, body] = replies[new URL(url).pathname];
    return status === 204
      ? new Response(null, { status })
      : Response.json(body, { status });
  });
  picker.requestCameraPermissionsAsync.mockResolvedValue({
    granted: true,
  } as ImagePicker.CameraPermissionResponse);
  picker.launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///qr.png", mimeType: "image/png" }],
  } as ImagePicker.ImagePickerResult);
  picker.launchCameraAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///box.jpg", mimeType: "image/jpeg" }],
  } as ImagePicker.ImagePickerResult);
});

// The app retries failed queries; here an error should show at once.
beforeAll(() => queryClient.setDefaultOptions({ queries: { retry: false } }));
afterEach(() => queryClient.clear());

function callTo(path: string, method = "GET") {
  return fetchMock.mock.calls.find(([input, init]) => {
    const url = urlOf(input);
    const verb = init?.method ?? (input as Request).method ?? "GET";
    return url.includes(path) && verb === method;
  });
}

async function toPhotos() {
  await fireEvent.press(
    await screen.findByRole("button", { name: "New return" }),
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Simons" }));
  await fireEvent.press(screen.getByRole("button", { name: "QR code" }));
  await fireEvent.press(screen.getByRole("button", { name: "Canada Post" }));
  await fireEvent.changeText(
    screen.getByLabelText("Order number (optional)"),
    "A-123",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
}

test("New return on Home lists the retailers", async () => {
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "New return" }),
  );
  expect(await screen.findByText("Where is it going back to?")).toBeTruthy();
  expect(await screen.findByRole("button", { name: "Zara" })).toBeTruthy();
});

test("the label step needs a label type and a carrier", async () => {
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "New return" }),
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Simons" }));
  const next = screen.getByRole("button", { name: "Next" });
  expect(next).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Printed label" }));
  expect(next).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "UPS" }));
  expect(next).toBeEnabled();
  expect(useDraft.getState()).toMatchObject({
    retailerId: "r1",
    labelType: "printed_label",
    carrier: "ups",
  });
});

test("a QR screenshot from the library is uploaded and its key kept", async () => {
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Label: choose from library" }),
  );
  expect(await screen.findByText("Label uploaded")).toBeTruthy();
  const presign = callTo("/uploads/presign", "POST")![0] as Request;
  expect(await presign.json()).toEqual({
    kind: "label",
    content_type: "image/png",
  });
  const [, put] = callTo(UPLOAD_URL, "PUT")!;
  expect(new Headers(put!.headers).get("Content-Type")).toBe("image/png");
  expect(await (put!.body as Blob).text()).toBe("photo-bytes");
  expect(useDraft.getState().labelPhoto).toEqual({
    key: "u1/label/abc.png",
    uri: "file:///qr.png",
  });
});

test("the package photo is taken with the camera", async () => {
  replies["/uploads/presign"] = [
    200,
    { key: "u1/package/def.jpg", url: UPLOAD_URL },
  ];
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Package: take a photo" }),
  );
  expect(await screen.findByText("Package uploaded")).toBeTruthy();
  expect(useDraft.getState().packagePhoto?.key).toBe("u1/package/def.jpg");
});

test("without camera access, it says how to allow it and uploads nothing", async () => {
  picker.requestCameraPermissionsAsync.mockResolvedValue({
    granted: false,
  } as ImagePicker.CameraPermissionResponse);
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Package: take a photo" }),
  );
  expect(
    await screen.findByText(
      "Allow camera access in your phone's settings, or choose a photo from your library.",
    ),
  ).toBeTruthy();
  expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  expect(callTo("/uploads/presign", "POST")).toBeUndefined();
});

test("closing the picker without a photo changes nothing", async () => {
  picker.launchImageLibraryAsync.mockResolvedValue({
    canceled: true,
    assets: null,
  } as ImagePicker.ImagePickerResult);
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Label: choose from library" }),
  );
  expect(callTo("/uploads/presign", "POST")).toBeUndefined();
  expect(useDraft.getState().labelPhoto).toBeNull();
});

test("a refused upload shows the API's message and keeps no key", async () => {
  replies["/uploads/u1/label/abc.png"] = [
    413,
    { detail: "This photo is too large." },
  ];
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Label: choose from library" }),
  );
  expect(await screen.findByText("This photo is too large.")).toBeTruthy();
  const [, put] = callTo(UPLOAD_URL, "PUT")!;
  expect(new Headers(put!.headers).get("Accept-Language")).toBe("en");
  expect(useDraft.getState().labelPhoto).toBeNull();
});

test("a photo type the API can't take is refused before uploading", async () => {
  picker.launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///anim.gif", mimeType: "image/gif" }],
  } as ImagePicker.ImagePickerResult);
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Label: choose from library" }),
  );
  expect(
    await screen.findByText("Choose a JPEG, PNG or HEIC photo."),
  ).toBeTruthy();
  expect(callTo("/uploads/presign", "POST")).toBeUndefined();
});

test("Back keeps your choices", async () => {
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Label: choose from library" }),
  );
  await screen.findByText("Label uploaded");
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("button", { name: "QR code" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Canada Post" })).toBeSelected();
  expect(screen.getByLabelText("Order number (optional)")).toHaveDisplayValue(
    "A-123",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Label uploaded")).toBeTruthy();
  expect(useDraft.getState().orderNumber).toBe("A-123");
});

test("starting another return clears the last draft", async () => {
  useDraft.setState({ retailerId: "r2", carrier: "ups" });
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "New return" }),
  );
  expect(
    await screen.findByRole("button", { name: "Zara" }),
  ).not.toBeSelected();
  expect(useDraft.getState().carrier).toBeNull();
});

test("every step reads in French", async () => {
  i18n.changeLanguage("fr");
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Nouveau retour" }),
  );
  await fireEvent.press(await screen.findByRole("button", { name: "Simons" }));
  expect(screen.getByRole("button", { name: "Postes Canada" })).toBeTruthy();
});

test("while a photo uploads, its buttons wait", async () => {
  let finish = () => {};
  picker.launchImageLibraryAsync.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = () =>
          resolve({
            canceled: true,
            assets: null,
          } as ImagePicker.ImagePickerResult);
      }),
  );
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Label: choose from library" }),
  );
  const camera = () =>
    screen.getByRole("button", { name: "Label: take a photo" });
  await waitFor(() => expect(camera()).toBeDisabled());
  await act(async () => finish());
  await waitFor(() => expect(camera()).toBeEnabled());
});

test("an upload that ends after a new return has started stays out of it", async () => {
  let finish = () => {};
  picker.launchImageLibraryAsync.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = () =>
          resolve({
            canceled: false,
            assets: [{ uri: "file:///qr.png", mimeType: "image/png" }],
          } as ImagePicker.ImagePickerResult);
      }),
  );
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Label: choose from library" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(
    await screen.findByRole("button", { name: "New return" }),
  );
  await act(async () => finish());
  await waitFor(() => expect(callTo(UPLOAD_URL, "PUT")).toBeDefined());
  expect(useDraft.getState().labelPhoto).toBeNull();
});

test("switching the label type drops the label photo", async () => {
  await renderRouter(routes);
  await toPhotos();
  await fireEvent.press(
    screen.getByRole("button", { name: "Label: choose from library" }),
  );
  await screen.findByText("Label uploaded");
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(screen.getByRole("button", { name: "QR code" }));
  expect(useDraft.getState().labelPhoto).not.toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Printed label" }));
  expect(useDraft.getState().labelPhoto).toBeNull();
});

async function toEligibility() {
  await toPhotos();
  const next = screen.getByRole("button", { name: "Next" });
  expect(next).toBeDisabled();
  useDraft.setState({
    labelPhoto: { key: "u1/label/abc.png", uri: "file:///qr.png" },
    packagePhoto: { key: "u1/package/def.jpg", uri: "file:///box.jpg" },
  });
  await waitFor(() => expect(next).toBeEnabled());
  await fireEvent.press(next);
  await screen.findByText("Is it sealed?");
}

const attest =
  "My answers are true, and I understand the driver can refuse a package that doesn't match them.";

test("passing answers lead straight to the attestation", async () => {
  await renderRouter(routes);
  await toEligibility();
  expect(screen.getByText("Taped shut, ready to ship.")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? Yes" }),
  );
  expect(screen.queryByRole("checkbox", { name: attest })).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Do you have the label? Yes" }),
  );
  await fireEvent.press(screen.getByRole("checkbox", { name: attest }));
  expect(screen.getByRole("checkbox", { name: attest })).toBeChecked();
  expect(useDraft.getState()).toMatchObject({
    answers: { sealed: "yes", label_ready: "yes" },
    policyVersion: 3,
    acknowledgedWarnings: false,
    attested: true,
  });
});

test("a warning needs acknowledging before the attestation shows", async () => {
  await renderRouter(routes);
  await toEligibility();
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? Not sure" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Do you have the label? Yes" }),
  );
  expect(screen.queryByRole("checkbox", { name: attest })).toBeNull();
  await fireEvent.press(screen.getByRole("checkbox", { name: "I understand" }));
  await fireEvent.press(screen.getByRole("checkbox", { name: attest }));
  expect(useDraft.getState()).toMatchObject({
    acknowledgedWarnings: true,
    attested: true,
  });
});

test("changing an answer takes back the attestation", async () => {
  await renderRouter(routes);
  await toEligibility();
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? Yes" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Do you have the label? Yes" }),
  );
  await fireEvent.press(screen.getByRole("checkbox", { name: attest }));
  // Tapping the answer already chosen changes nothing.
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? Yes" }),
  );
  expect(useDraft.getState().attested).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? Not sure" }),
  );
  expect(useDraft.getState().attested).toBe(false);
});

test("answers to an older question set start over", async () => {
  await renderRouter(routes);
  await toEligibility();
  useDraft.setState({
    answers: { sealed: "yes", label_ready: "yes" },
    policyVersion: 2,
    attested: true,
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Is it sealed? Yes" }),
    ).not.toBeSelected(),
  );
  expect(screen.queryByRole("checkbox")).toBeNull();
  // The old attestation doesn't count either.
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? Yes" }),
  );
  expect(useDraft.getState()).toMatchObject({
    answers: { sealed: "yes" },
    policyVersion: 3,
    attested: false,
  });
});

test("a blocking answer ends the flow with the reason", async () => {
  await renderRouter(routes);
  await toEligibility();
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? No" }),
  );
  expect(await screen.findByText("We can't take this return")).toBeTruthy();
  expect(screen.getByText("Is it sealed? No")).toBeTruthy();
  // Back to fix a wrong tap: still blocked, no way to attest.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Do you have the label? Yes" }),
  );
  expect(
    screen.getByText("With this answer, we can't pick up this return."),
  ).toBeTruthy();
  expect(screen.queryByRole("checkbox")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? No" }),
  );
  await fireEvent.press(
    await screen.findByRole("button", { name: "Back to home" }),
  );
  expect(
    await screen.findByRole("button", { name: "New return" }),
  ).toBeTruthy();
});

test("the questions read in French", async () => {
  i18n.changeLanguage("fr");
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Nouveau retour" }),
  );
  useDraft.setState({ answers: { sealed: "no" } });
  await act(async () => router.push("/new-return/blocked"));
  expect(
    await screen.findByText("Nous ne pouvons pas prendre ce retour"),
  ).toBeTruthy();
});

test("switching language drops the questions loaded in the old one", async () => {
  await renderRouter(routes);
  await toEligibility();
  for (let i = 0; i < 4; i++)
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(
    await screen.findByRole("button", { name: "Français, switch to French" }),
  );
  expect(
    queryClient.getQueryData(eligibilityQuestionsQueryKey()),
  ).toBeUndefined();
});

test("Next leaves the questions once attested", async () => {
  await renderRouter(routes);
  await toEligibility();
  await fireEvent.press(
    screen.getByRole("button", { name: "Is it sealed? Yes" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Do you have the label? Yes" }),
  );
  const next = screen.getByRole("button", { name: "Next" });
  expect(next).toBeDisabled();
  await fireEvent.press(screen.getByRole("checkbox", { name: attest }));
  await fireEvent.press(next);
  expect(await screen.findByText("Pickup address")).toBeTruthy();
});

// Starts a new return (which clears the draft), then jumps to a step.
async function openStep(path: string, draft: typeof READY = {}) {
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "New return" }),
  );
  await act(async () => {
    useDraft.setState(draft);
    router.push(path as never);
  });
}

const search = () => screen.getByLabelText("Street address");

function callsTo(path: string, method = "GET") {
  return fetchMock.mock.calls.filter(([input, init]) => {
    const verb = init?.method ?? (input as Request).method ?? "GET";
    return new URL(urlOf(input)).pathname === path && verb === method;
  });
}

test("an address is searched, chosen and kept", async () => {
  await openStep("/new-return/address");
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  await fireEvent.changeText(search(), "1 rue");
  await fireEvent.press(
    await screen.findByRole("button", {
      name: "1 Rue Sainte-Catherine O, Montréal",
    }),
  );
  await screen.findByText(ADDRESS);
  // Chosen: the address shows on its own, with no empty search asking for it again.
  expect(screen.queryByLabelText("Street address")).toBeNull();
  expect(useDraft.getState().address).toEqual({
    address: ADDRESS,
    token: "addr-tok",
  });
  // One Google session from typing to choosing (billing).
  const session = (path: string) =>
    new URL(urlOf(callTo(path)![0])).searchParams.get("session");
  expect(session("/addresses/autocomplete")).toBeTruthy();
  expect(session("/addresses/resolve")).toBe(
    session("/addresses/autocomplete"),
  );
  await fireEvent.changeText(
    screen.getByLabelText(
      "Apartment, buzzer or notes for the driver (optional)",
    ),
    "Apt 4, buzz 204",
  );
  expect(useDraft.getState().pickupNotes).toBe("Apt 4, buzz 204");
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  expect(await screen.findByText("Pickup time")).toBeTruthy();
});

test("only the settled text is searched", async () => {
  await openStep("/new-return/address");
  for (const text of ["1", "1 r", "1 ru", "1 rue"])
    await fireEvent.changeText(search(), text);
  await screen.findByRole("button", {
    name: "1 Rue Sainte-Catherine O, Montréal",
  });
  const calls = callsTo("/addresses/autocomplete");
  expect(calls).toHaveLength(1);
  expect(new URL(urlOf(calls[0][0])).searchParams.get("q")).toBe("1 rue");
});

test("an address outside the area is refused with the API's message", async () => {
  replies["/addresses/resolve"] = [
    422,
    { detail: "We don't pick up there yet." },
  ];
  await openStep("/new-return/address");
  await fireEvent.changeText(search(), "1 rue");
  await fireEvent.press(
    await screen.findByRole("button", {
      name: "1 Rue Sainte-Catherine O, Montréal",
    }),
  );
  expect(await screen.findByText("We don't pick up there yet.")).toBeTruthy();
  expect(useDraft.getState().address).toBeNull();
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});

// The time step asks for the windows of this carrier near this address (ADR 0017).
const WHERE: typeof READY = {
  carrier: "canada_post",
  address: { address: ADDRESS, token: "addr-tok" },
};

test("the time step asks for windows for the carrier and address", async () => {
  await openStep("/new-return/time", WHERE);
  await screen.findByRole("button", { name: slotLabel(SLOT) });
  const url = new URL(urlOf(callsTo("/booking/options").at(-1)![0]));
  expect(url.searchParams.get("carrier")).toBe("canada_post");
  expect(url.searchParams.get("address_token")).toBe("addr-tok");
});

test("the time step says when no window is left", async () => {
  replies["/booking/options"] = [200, { pickup_fee: 499, slots: [] }];
  await openStep("/new-return/time", WHERE);
  expect(
    await screen.findByText(
      "No pickup times left today or tomorrow: no Canada Post counter near you will be open. Try again later.",
    ),
  ).toBeTruthy();
});

test("a pickup time is chosen, and a time that's gone can't be kept", async () => {
  await openStep("/new-return/time", WHERE);
  const next = screen.getByRole("button", { name: "Next" });
  expect(next).toBeDisabled();
  await fireEvent.press(
    await screen.findByRole("button", { name: slotLabel(SLOT) }),
  );
  expect(next).toBeEnabled();
  expect(useDraft.getState().slot).toEqual(SLOT);
  replies["/booking/options"] = [200, { pickup_fee: 499, slots: [ASAP] }];
  await act(() =>
    queryClient.invalidateQueries({
      queryKey: bookingOptionsQuery(useDraft.getState()).queryKey,
    }),
  );
  await waitFor(() => expect(next).toBeDisabled());
});

const READY: Partial<ReturnType<typeof useDraft.getState>> = {
  retailerId: "r1",
  labelType: "qr_code",
  carrier: "canada_post",
  orderNumber: " A-123 ",
  labelPhoto: { key: "u1/label/abc.png", uri: "file:///qr.png" },
  packagePhoto: { key: "u1/package/def.jpg", uri: "file:///box.jpg" },
  answers: { sealed: "yes", label_ready: "yes" },
  policyVersion: 3,
  acknowledgedWarnings: false,
  attested: true,
  address: { address: ADDRESS, token: "addr-tok" },
  pickupNotes: "  ",
  slot: SLOT,
};
function withPhone() {
  const [, me] = replies["/me"];
  replies["/me"] = [200, { ...(me as object), phone: "+15145550123" }];
}
const book = () => screen.findByRole("button", { name: "Book pickup" });
// Book waits for the current pickup times, which come with the price.
const loaded = () => screen.findByText("$4.99, all fees included");

test("a return is booked and confirmed", async () => {
  withPhone();
  await openStep("/new-return/review", READY);
  expect(await screen.findByText("Simons")).toBeTruthy();
  expect(screen.getByText(ADDRESS)).toBeTruthy();
  expect(await loaded()).toBeTruthy();
  expect(screen.getByText(slotLabel(SLOT))).toBeTruthy();
  expect(screen.getByText("Plus GST/QST")).toBeTruthy();
  expect(screen.queryByLabelText("Phone number")).toBeNull();
  await fireEvent.press(await book());
  expect(await screen.findByText("Pickup booked")).toBeTruthy();
  expect(await screen.findByText(ADDRESS)).toBeTruthy();
  const [request] = callTo("/returns", "POST")!;
  expect(await (request as Request).json()).toEqual({
    retailer_id: "r1",
    carrier: "canada_post",
    label_type: "qr_code",
    order_number: "A-123",
    label_photo_key: "u1/label/abc.png",
    package_photo_key: "u1/package/def.jpg",
    address_token: "addr-tok",
    pickup_notes: null,
    asap: false,
    pickup_window_start: SLOT.start,
    answers: { sealed: "yes", label_ready: "yes" },
    policy_version: 3,
    acknowledged_warnings: false,
    attested: true,
  });
  expect(useDraft.getState().address).toBeNull();
  // The booking is spent: Back goes home, not to the review.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(
    await screen.findByRole("button", { name: "New return" }),
  ).toBeTruthy();
});

test("ASAP is booked as ASAP", async () => {
  withPhone();
  await openStep("/new-return/review", { ...READY, slot: ASAP });
  await loaded();
  await fireEvent.press(await book());
  await screen.findByText("Pickup booked");
  const [request] = callTo("/returns", "POST")!;
  expect(await (request as Request).json()).toMatchObject({
    asap: true,
    pickup_window_start: null,
  });
});

test("without a phone number, it is asked for first", async () => {
  await openStep("/new-return/review", READY);
  const phone = await screen.findByLabelText("Phone number");
  await loaded();
  expect(await book()).toBeDisabled();
  await fireEvent.changeText(phone, "514 555 0123");
  await fireEvent.press(await book());
  await screen.findByText("Pickup booked");
  const patch = callTo("/me", "PATCH")!;
  expect(await (patch[0] as Request).json()).toEqual({ phone: "514 555 0123" });
  expect(fetchMock.mock.calls.indexOf(patch)).toBeLessThan(
    fetchMock.mock.calls.indexOf(callTo("/returns", "POST")!),
  );
});

test("a refused booking says why, books nothing and refreshes the times", async () => {
  withPhone();
  replies["/returns"] = [
    422,
    { detail: "This pickup time is no longer available. Choose another." },
  ];
  await openStep("/new-return/review", READY);
  await loaded();
  const fetched = callsTo("/booking/options").length;
  await fireEvent.press(await book());
  expect(
    await screen.findByText(
      "This pickup time is no longer available. Choose another.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("Pickup booked")).toBeNull();
  await waitFor(() =>
    expect(callsTo("/booking/options").length).toBeGreaterThan(fetched),
  );
});

test("a double tap books once", async () => {
  withPhone();
  await openStep("/new-return/review", READY);
  await loaded();
  const button = await book();
  await fireEvent.press(button);
  await fireEvent.press(button);
  await screen.findByText("Pickup booked");
  expect(callsTo("/returns", "POST")).toHaveLength(1);
});

test("the booking steps read in French", async () => {
  i18n.changeLanguage("fr");
  withPhone();
  await renderRouter(routes);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Nouveau retour" }),
  );
  await act(async () => {
    useDraft.setState(READY);
    router.push("/new-return/review");
  });
  expect(
    await screen.findByText(/^4,99\s\$, tous frais compris$/),
  ).toBeTruthy();
  expect(screen.getByText("Plus TPS/TVQ")).toBeTruthy();
});

test("a search error clears once the search does", async () => {
  replies["/addresses/autocomplete"] = [502, { detail: "Search is down." }];
  await openStep("/new-return/address");
  await fireEvent.changeText(search(), "1 rue");
  expect(await screen.findByText("Search is down.")).toBeTruthy();
  await fireEvent.changeText(search(), "");
  await waitFor(() => expect(screen.queryByText("Search is down.")).toBeNull());
});

test("a time that has passed can't be booked from the review", async () => {
  withPhone();
  replies["/booking/options"] = [200, { pickup_fee: 499, slots: [ASAP] }];
  await openStep("/new-return/review", READY);
  expect(
    await screen.findByText(
      "This pickup time has passed. Go back and choose another.",
    ),
  ).toBeTruthy();
  expect(await book()).toBeDisabled();
});

test("if the profile can't load, the phone is asked for anyway", async () => {
  replies["/me"] = [500, { detail: "Down." }];
  await openStep("/new-return/review", READY);
  expect(await screen.findByLabelText("Phone number")).toBeTruthy();
});

test("Change address starts a new search", async () => {
  await openStep("/new-return/address", {
    address: { address: ADDRESS, token: "addr-tok" },
  });
  expect(screen.getByText(ADDRESS)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  await fireEvent.press(screen.getByRole("button", { name: "Change address" }));
  expect(search()).toBeTruthy();
  expect(useDraft.getState().address).toBeNull();
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});
