import { render, screen } from "@testing-library/react-native";

import Home from "../app/index";

test("renders the home screen", async () => {
  await render(<Home />);
  expect(screen.getByText("Boomerang")).toBeTruthy();
});
