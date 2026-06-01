import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { initCapacitor } from "./app/lib/capacitorApp.ts";
import "./styles/index.css";
import "./i18n";

void initCapacitor();
createRoot(document.getElementById("root")!).render(<App />);
  