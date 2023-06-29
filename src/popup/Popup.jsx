import {useEffect, useState} from "react";
import "./Popup.css";

function App() {
  const [theme, setTheme] = useState("");

  const handleChange = (event) => {
    setTheme(event.target.value);
    console.log("theme is set", theme);
  };

  const handleSet = () => {
    chrome.storage.local.set({theme: theme}, function() {
      console.log("theme is stored", theme);
    });
  };

  useEffect(() => {
    const getStoredTheme = async () => {
      try {
        const result = await new Promise((resolve) =>
          chrome.storage.local.get(["theme"], resolve)
        );
        if (result.theme) {
          console.log("theme is recovered", theme);
          setTheme(result.theme);
        }
      } catch (error) {
        console.error(error);
      }
    };

    getStoredTheme();
  }, []);

  return (
    <main>
      <h3>What is your interest?</h3>
      <div className="content">
        <textarea id="input" value={theme} onChange={handleChange}/>
        <button type="button" onClick={handleSet}>
          Set
        </button>
      </div>
    </main>
  );
}

export default App;
