import { Minus, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TitleButtonProps = {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
    hoverColor: string;
};

const TitleButton = ({ label, onClick, children, hoverColor }: TitleButtonProps) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className="w-6 h-6 flex items-center justify-center rounded-md transition-all"
        style={{
            background: "rgba(62, 39, 35, 0.65)",
            border: "1px solid rgba(218, 165, 32, 0.3)",
            color: "#E6D8C6",
            boxShadow: "0 4px 10px -8px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = hoverColor;
            e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(62, 39, 35, 0.65)";
            e.currentTarget.style.color = "#E6D8C6";
        }}
    >
        {children}
    </button>
);

const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const isElectron = useMemo(() => typeof window !== "undefined" && Boolean(window.electronAPI), []);

    useEffect(() => {
        if (!isElectron || !window.electronAPI) return;

        window.electronAPI
            .isMaximized?.()
            .then((maximized) => {
                setIsMaximized(Boolean(maximized));
            })
            .catch(() => {
                setIsMaximized(false);
            });

        const dispose = window.electronAPI.onMaximizeChanged?.((maximized) => {
            setIsMaximized(Boolean(maximized));
        });

        return () => {
            dispose?.();
        };
    }, [isElectron]);

    if (!isElectron) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-40 select-none"
            style={{
                WebkitAppRegion: "drag",
                height: "34px",
                background: "linear-gradient(180deg, rgba(250, 248, 245, 0.72) 0%, rgba(240, 233, 223, 0.82) 60%, rgba(233, 222, 209, 0.9) 100%)",
                boxShadow: "0 8px 24px -18px rgba(0,0,0,0.35), inset 0 -1px 0 rgba(218, 165, 32, 0.18)",
                backdropFilter: "blur(12px)",
                padding: "4px 10px",
                display: "flex",
                alignItems: "center",
                position: "fixed",
            } as any}
        >
            {/* Blend with sidebar on the left */}
            <div
                className="absolute inset-y-0 left-0"
                style={{
                    width: "120px",
                    pointerEvents: "none",
                    background:
                        "linear-gradient(90deg, rgba(62, 39, 35, 0.38) 0%, rgba(62, 39, 35, 0.22) 35%, rgba(62, 39, 35, 0.1) 70%, rgba(62, 39, 35, 0) 100%)",
                    backdropFilter: "blur(6px)",
                    opacity: 0.9,
                }}
            />

            <div
                style={{
                    flex: 1,
                    height: "100%",
                    WebkitAppRegion: "drag",
                } as any}
            />

            <div
                className="flex items-center h-full gap-2"
                style={{
                    WebkitAppRegion: "no-drag",
                } as any}
            >
                <div
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
                    style={{
                        background: "rgba(33, 24, 18, 0.18)",
                        border: "1px solid rgba(218, 165, 32, 0.26)",
                        boxShadow: "0 10px 30px -20px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)",
                        backdropFilter: "blur(10px)",
                        WebkitAppRegion: "no-drag",
                    } as any}
                >
                    <TitleButton label="Minimize" hoverColor="rgba(218, 165, 32, 0.3)" onClick={() => window.electronAPI?.minimize()}>
                        <Minus size={11} />
                    </TitleButton>

                    <TitleButton label={isMaximized ? "Restore" : "Maximize"} hoverColor="rgba(94, 170, 120, 0.32)" onClick={() => window.electronAPI?.toggleMaximize()}>
                        <Square size={11} />
                    </TitleButton>

                    <TitleButton label="Close" hoverColor="rgba(220, 53, 69, 0.35)" onClick={() => window.electronAPI?.close()}>
                        <X size={11} />
                    </TitleButton>
                </div>
            </div>
        </div>
    );
};

export default TitleBar;
