import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const layoutStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    minWidth: "100vw",
    minHeight: "100vh",
    overflow: "hidden",
    position: "relative",
  };

  return <div style={layoutStyle}>{children}</div>;
};

export default Layout;
