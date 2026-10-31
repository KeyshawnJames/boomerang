import { fireEvent, renderRouter, screen } from "expo-router/testing-library";
import * as ImagePicker from "expo-image-picker";

import { queryClient } from "../api";
import RootLayout from "../app/_layout";
import Home from "../app/index";
import NewReturnLayout from "../app/new-return/_layout";
import Retailer from "../app/new-return/index";
import Label from "../app/new-return/label";
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
