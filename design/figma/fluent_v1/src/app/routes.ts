import { createBrowserRouter, redirect } from "react-router";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import SettingsRecording from "./pages/SettingsRecording";
import SettingsDetection from "./pages/SettingsDetection";
import Diagnostics from "./pages/Diagnostics";
import MiniPanel from "./pages/MiniPanel";
import AccountUpdate from "./pages/AccountUpdate";
import DesignTokens from "./pages/DesignTokens";
import ComponentLibrary from "./pages/ComponentLibrary";
import { isEngineeringUiEnabled } from "./lib/featureFlags";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Index,
  },
  {
    path: "/welcome",
    Component: Welcome,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/history",
    Component: History,
  },
  {
    path: "/settings/recording",
    Component: SettingsRecording,
  },
  {
    path: "/settings/detection",
    Component: SettingsDetection,
  },
  {
    path: "/diagnostics",
    Component: Diagnostics,
  },
  {
    path: "/mini-panel",
    Component: MiniPanel,
  },
  {
    path: "/account-update",
    Component: AccountUpdate,
  },
  ...(isEngineeringUiEnabled
    ? [
        {
          path: "/design-tokens",
          Component: DesignTokens,
        },
        {
          path: "/component-library",
          Component: ComponentLibrary,
        },
      ]
    : [
        {
          path: "/design-tokens",
          loader: () => redirect("/dashboard"),
        },
        {
          path: "/component-library",
          loader: () => redirect("/dashboard"),
        },
      ]),
]);
