import "./design/tokens.css";
import "./App.css";
import { PortalProvider } from "./context/PortalContext";
import { PortalPage } from "./pages/PortalPage";

function App() {
	return (
		<PortalProvider initialMode="live">
			<PortalPage />
		</PortalProvider>
	);
}

export default App;
