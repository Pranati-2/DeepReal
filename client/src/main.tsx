import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Load FontAwesome CSS from CDN
const fontawesomeLink = document.createElement("link");
fontawesomeLink.rel = "stylesheet";
fontawesomeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
document.head.appendChild(fontawesomeLink);

// Load Inter font from Google Fonts
const interFontLink = document.createElement("link");
interFontLink.rel = "stylesheet";
interFontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
document.head.appendChild(interFontLink);

// Set page title
const titleElement = document.createElement("title");
titleElement.textContent = "DeepReal - AI Video Conversation Platform";
document.head.appendChild(titleElement);

// Render the app
createRoot(document.getElementById("root")!).render(<App />);
