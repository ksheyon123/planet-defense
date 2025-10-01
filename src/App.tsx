import React from "react";
import Layout from "@/components/Layout";
import BabylonScene from "@/components/BabylonScene";
import { BabylonProvider } from "./contexts/BabylonContext";

function App() {
  return (
    <Layout>
      <BabylonProvider>
        <BabylonScene />
      </BabylonProvider>
    </Layout>
  );
}

export default App;
