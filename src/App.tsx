import React from "react";
import Layout from "@/components/Layout";
import { BabylonProvider } from "./contexts/BabylonContext";

function App() {
  return (
    <Layout>
      <BabylonProvider>
        <></>
      </BabylonProvider>
    </Layout>
  );
}

export default App;
