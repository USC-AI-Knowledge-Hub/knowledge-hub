import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/Layout";
import { FeedProvider } from "./lib/feed";
import { About } from "./pages/About";
import { Home } from "./pages/Home";
import { Learn } from "./pages/Learn";
import { ModulePage } from "./pages/ModulePage";
import { NotFound } from "./pages/NotFound";
import { PathPage } from "./pages/PathPage";
import { Search } from "./pages/Search";
import { ToolPage } from "./pages/ToolPage";
import { Tools } from "./pages/Tools";
import { Watch } from "./pages/Watch";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/pages.css";

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <Home /> },
        { path: "learn", element: <Learn /> },
        { path: "learn/path/:id", element: <PathPage /> },
        { path: "learn/:id", element: <ModulePage /> },
        { path: "tools", element: <Tools /> },
        { path: "tools/:id", element: <ToolPage /> },
        { path: "watch", element: <Watch /> },
        { path: "search", element: <Search /> },
        { path: "about", element: <About /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FeedProvider>
      <RouterProvider router={router} />
    </FeedProvider>
  </StrictMode>,
);
