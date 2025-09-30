import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as BABYLON from "@babylonjs/core";

// Context 타입 정의
interface BabylonContextType {
  scene: BABYLON.Scene | null;
  engine: BABYLON.Engine | null;
  canvas: HTMLCanvasElement | null;
  isReady: boolean;
}

// Context 생성
const BabylonContext = createContext<BabylonContextType | undefined>(undefined);

// Provider Props 타입
interface BabylonProviderProps {
  children: ReactNode;
  antialias?: boolean;
  engineOptions?: BABYLON.EngineOptions;
  adaptToDeviceRatio?: boolean;
}

// Provider 컴포넌트
export const BabylonProvider: React.FC<BabylonProviderProps> = ({
  children,
  antialias = true,
  engineOptions,
  adaptToDeviceRatio = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Engine 생성
    const engine = new BABYLON.Engine(
      canvasRef.current,
      antialias,
      engineOptions,
      adaptToDeviceRatio
    );
    engineRef.current = engine;

    // Scene 생성
    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;

    // 기본 카메라 설정 (옵션)
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 2,
      10,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);

    // 기본 조명 설정 (옵션)
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

    // 렌더 루프 시작
    engine.runRenderLoop(() => {
      scene.render();
    });

    // 윈도우 리사이즈 처리
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    setIsReady(true);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [antialias, engineOptions, adaptToDeviceRatio]);

  const contextValue: BabylonContextType = {
    scene: sceneRef.current,
    engine: engineRef.current,
    canvas: canvasRef.current,
    isReady,
  };

  return (
    <BabylonContext.Provider value={contextValue}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          outline: "none",
        }}
      />
      {isReady && children}
    </BabylonContext.Provider>
  );
};

// Custom Hook
export const useBabylon = (): BabylonContextType => {
  const context = useContext(BabylonContext);

  if (context === undefined) {
    throw new Error("useBabylon must be used within a BabylonProvider");
  }

  return context;
};

// 타입 export (다른 파일에서 사용)
export type { BabylonContextType };
