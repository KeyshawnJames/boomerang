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
};
const UPLOAD_URL = "http://localhost:8000/uploads/u1/label/abc.png?token=t";

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
