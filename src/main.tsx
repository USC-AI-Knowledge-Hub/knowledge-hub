import { loadCatalog } from "./lib/catalogStore";
import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { Layout } from "./components/Layout";
import { FeedProvider } from "./lib/feed";
import { resumeOffline } from "./lib/offline";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { MOVED } from "./data/sections";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/pages.css";

/**
 * Pages load on demand, so a first visit downloads the home page and the shell, not every page, lesson and
 * tutor quest. The build still writes a real HTML page for every address (scripts/prerender.ts), and offline
 * mode saves every file in assets/, so this changes nothing a visitor sees.
 */
const page =
  <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  async () => ({ Component: (await load())[name] });

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <Home /> },
        { path: "learn", lazy: page(() => import("./pages/Learn"), "Learn") },
        {
          path: "learn/courses",
          lazy: page(() => import("./pages/Courses"), "Courses"),
        },
        {
          path: "learn/path/:id",
          lazy: page(() => import("./pages/PathPage"), "PathPage"),
        },
        {
          path: "learn/path/:path/:id",
          lazy: page(() => import("./pages/LessonPlayer"), "LessonPlayer"),
        },
        {
          path: "learn/lesson/:id",
          lazy: page(() => import("./pages/LessonPlayer"), "LessonPlayer"),
        },
        {
          path: "learn/:id",
          lazy: page(() => import("./pages/ModulePage"), "ModulePage"),
        },
        { path: "tools", lazy: page(() => import("./pages/Tools"), "Tools") },
        {
          path: "tools/compare",
          lazy: page(() => import("./pages/Compare"), "Compare"),
        },
        {
          path: "tools/compare/:pair",
          lazy: page(() => import("./pages/Compare"), "Compare"),
        },
        {
          path: "tools/:id",
          lazy: page(() => import("./pages/ToolPage"), "ToolPage"),
        },
        { path: "watch", lazy: page(() => import("./pages/Watch"), "Watch") },
        { path: "green", lazy: page(() => import("./pages/Green"), "Green") },
        { path: "team", lazy: page(() => import("./pages/Team"), "Team") },
        {
          path: "team/picks",
          lazy: page(() => import("./pages/TeamTest"), "TeamTest"),
        },
        { path: "start", lazy: page(() => import("./pages/Start"), "Start") },
        { path: "ai-use", lazy: page(() => import("./pages/AiUse"), "AiUse") },
        {
          path: "prompts",
          lazy: page(() => import("./pages/Prompts"), "Prompts"),
        },
        {
          path: "new",
          lazy: page(() => import("./pages/WhatsNew"), "WhatsNew"),
        },
        {
          path: "offline",
          lazy: page(() => import("./pages/Offline"), "Offline"),
        },
        {
          path: "offline/assistant",
          lazy: page(() => import("./pages/Assistant"), "Assistant"),
        },
        {
          path: "search",
          lazy: page(() => import("./pages/Search"), "Search"),
        },
        { path: "about", lazy: page(() => import("./pages/About"), "About") },
        ...Object.entries(MOVED).map(([from, to]) => ({
          path: from.slice(1),
          element: <Navigate to={to} replace />,
        })),
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);

void loadCatalog();
resumeOffline();

const render = () =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <FeedProvider>
        <RouterProvider router={router} />
      </FeedProvider>
    </StrictMode>,
  );

// Keep the prerendered page on screen until the first page's code has arrived, instead of a blank moment.
if (router.state.initialized) render();
else {
  const stop = router.subscribe((state) => {
    if (!state.initialized) return;
    stop();
    render();
  });
}
