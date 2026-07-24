import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CreacloudApp from "./creacloud-app";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CreacloudApp />
  </StrictMode>,
);
