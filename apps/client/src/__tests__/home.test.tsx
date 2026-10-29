import { fireEvent, render, screen } from "@testing-library/react-native";

import Home from "../app/index";
import i18n from "../i18n";

beforeEach(() => i18n.changeLanguage("en"));

test("renders the home screen", async () => {
  await render(<Home />);
  expect(screen.getByText("Boomerang")).toBeTruthy();
  expect(screen.getByText("Returns, picked up.")).toBeTruthy();
});

test("the language toggle switches to French and back", async () => {
  await render(<Home />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Français, switch to French" }),
  );
  expect(screen.getByText("Vos retours, cueillis à domicile.")).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "English, passer à l'anglais" }),
  );
  expect(screen.getByText("Returns, picked up.")).toBeTruthy();
});
