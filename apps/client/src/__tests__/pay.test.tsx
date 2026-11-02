import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { queryClient } from "../api";
import RootLayout from "../app/_layout";
import Home from "../app/index";
import NewReturnLayout from "../app/new-return/_layout";
import Retailer from "../app/new-return/index";
import Booked from "../app/returns/[id]";
import i18n from "../i18n";
import { useSession } from "../session";

const routes = {
  _layout: RootLayout,
  index: Home,
  "new-return/_layout": NewReturnLayout,
  "new-return/index": Retailer,
  "returns/[id]": Booked,
};
const RETURN = {
  id: "ret1",
  status: "awaiting_payment",
  retailer_id: "r1",
  carrier: "canada_post",
  label_type: "qr_code",
  order_number: null,
  pickup_address: "1 Rue Sainte-Catherine O, Montréal, QC H3B 1A1",
  pickup_notes: null,
  pickup_window_start: "2026-10-31T16:00:00-04:00",
  pickup_window_end: "2026-10-31T18:00:00-04:00",
  pickup_fee: 499,
  eligibility_outcome: "eligible",
  created_at: "2026-10-31T14:07:00-04:00",
};

type Reply = [status: number, body: unknown];
let replies: Record<string, Reply>;
const fetchMock = jest.spyOn(globalThis, "fetch");
// The same mocks every render gets (jest.setup.ts).
const { useStripe: mockedStripe } = jest.requireMock<
  typeof import("@stripe/stripe-react-native")
>("@stripe/stripe-react-native");
const stripe = jest.mocked(mockedStripe());

beforeEach(() => {
  i18n.changeLanguage("en");
  useSession.getState().signIn("tok");
  replies = {
    "/health": [200, { status: "ok", database: "ok" }],
    "/me": [200, { id: "u1", role: "client", name: "Ada", email: "a@b.ca" }],
    "/retailers": [200, []],
    "/returns/ret1": [200, RETURN],
    "/returns/ret1/pay": [200, { client_secret: "pi_1_secret", total: 699 }],
  };
  jest.clearAllMocks();
  fetchMock.mockImplementation(async (input) => {
    const url = (input as Request).url;
    const [status, body] = replies[new URL(url).pathname];
    return Response.json(body, { status });
  });
});

beforeAll(() => queryClient.setDefaultOptions({ queries: { retry: false } }));
afterEach(() => queryClient.clear());

const open = () => renderRouter(routes, { initialUrl: "/returns/ret1" });
const payButton = (total: string) =>
  screen.findByRole("button", { name: `Pay ${total}` });

async function paidTip() {
  const call = fetchMock.mock.calls.find(
    ([input]) => (input as Request).method === "POST",
  )!;
  return (await (call[0] as Request).json()).tip;
}

test("shows the total with the chosen tip", async () => {
  await open();
  expect(await payButton("$4.99")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "$2.00" }));
  expect(screen.getByText("$6.99")).toBeTruthy();
  await fireEvent.press(await payButton("$6.99"));
  await waitFor(() => expect(stripe.presentPaymentSheet).toHaveBeenCalled());
  expect(await paidTip()).toBe(200);
  expect(stripe.initPaymentSheet).toHaveBeenCalledWith(
    expect.objectContaining({ paymentIntentClientSecret: "pi_1_secret" }),
  );
});

test("other tip accepts a French comma and caps at $50", async () => {
  await open();
  await fireEvent.press(await screen.findByRole("button", { name: "Other" }));
  const amount = screen.getByLabelText("Tip amount");
  await fireEvent.changeText(amount, "51");
  expect(await payButton("$4.99")).toBeDisabled();
  await fireEvent.changeText(amount, "abc");
  expect(await payButton("$4.99")).toBeDisabled();
  await fireEvent.changeText(amount, "5,50");
  await fireEvent.press(await payButton("$10.49"));
  await waitFor(() => expect(stripe.presentPaymentSheet).toHaveBeenCalled());
  expect(await paidTip()).toBe(550);
});

test("paying waits for the webhook, then shows the booking", async () => {
  await open();
  await fireEvent.press(await payButton("$4.99"));
  expect(await screen.findByText("Confirming your payment")).toBeTruthy();
  expect(screen.queryByText("Pickup booked")).toBeNull();
  replies["/returns/ret1"] = [200, { ...RETURN, status: "requested" }];
  expect(
    await screen.findByText("Pickup booked", {}, { timeout: 4000 }),
  ).toBeTruthy();
  expect(screen.getByText("$6.99")).toBeTruthy();
});

test("a cancelled card screen stays on the pay screen quietly", async () => {
  stripe.presentPaymentSheet.mockResolvedValueOnce({
    error: { code: "Canceled", message: "", localizedMessage: "" },
  } as never);
  await open();
  await fireEvent.press(await payButton("$4.99"));
  await waitFor(() => expect(stripe.presentPaymentSheet).toHaveBeenCalled());
  expect(await payButton("$4.99")).toBeEnabled();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("a failed card shows Stripe's message and can be retried", async () => {
  stripe.presentPaymentSheet.mockResolvedValueOnce({
    error: {
      code: "Failed",
      message: "Your card was declined.",
      localizedMessage: "Your card was declined.",
    },
  } as never);
  await open();
  await fireEvent.press(await payButton("$4.99"));
  expect(await screen.findByText("Your card was declined.")).toBeTruthy();
  await fireEvent.press(await payButton("$4.99"));
  expect(await screen.findByText("Confirming your payment")).toBeTruthy();
});

test("an expired booking sends the client to book again", async () => {
  replies["/returns/ret1/pay"] = [
    410,
    { detail: "This booking has expired. Book your pickup again." },
  ];
  await open();
  await fireEvent.press(await payButton("$4.99"));
  expect(
    await screen.findByText(
      "This booking has expired. Book your pickup again.",
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Book again" }));
  expect(await screen.findByText("Where is it going back to?")).toBeTruthy();
});

test("the pay screen reads in French", async () => {
  i18n.changeLanguage("fr");
  await open();
  expect(await screen.findByText("Pourboire et paiement")).toBeTruthy();
  expect(
    await screen.findByRole("button", { name: "Aucun pourboire" }),
  ).toBeTruthy();
});

test("a payment already going through waits for the webhook too", async () => {
  replies["/returns/ret1/pay"] = [
    409,
    { detail: "Your payment is already going through." },
  ];
  await open();
  await fireEvent.press(await payButton("$4.99"));
  expect(await screen.findByText("Confirming your payment")).toBeTruthy();
  expect(stripe.presentPaymentSheet).not.toHaveBeenCalled();
  replies["/returns/ret1"] = [200, { ...RETURN, status: "requested" }];
  expect(
    await screen.findByText("Pickup booked", {}, { timeout: 4000 }),
  ).toBeTruthy();
  // Booked now, so the earlier error is no longer shown.
  expect(screen.queryByRole("alert")).toBeNull();
});
