import "./design/tokens.css";
import "./App.css";
import { PortalProvider } from "./context/PortalContext";
import { FilterProvider } from "./context/FilterContext";
import { PortalPage } from "./pages/PortalPage";

function App() {
	return (
		<PortalProvider initialMode="live">
			<FilterProvider>
				<PortalPage />
			</FilterProvider>
		</PortalProvider>
	);
}

export default App;
