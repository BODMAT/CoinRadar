import { useEffect } from "react";
import { menu, type MenuItem } from "./data";
import { useBurgerMenu } from "../../hooks/useBurgerMenu";
import { scrollToSectionById } from "../../utils/functions";
import { Auth } from "../Auth/Auth";

export function FixedHeader() {
    const { isBurgerOpen, toggleBurger, isMobile } = useBurgerMenu();

    useEffect(() => {
        document.body.style.overflow = isBurgerOpen && isMobile ? "hidden" : "";
        document.body.style.height = isBurgerOpen && isMobile ? "100vh" : "";

        return () => {
            const root = document.getElementById("root");
            if (root) {
                root.style.overflow = "";
                root.style.height = "";
            }
        };
    }, [isBurgerOpen, isMobile]);

    const renderMenuButtons = (closeBurger = false) => {
        return (
            <>
                {menu.map((item: MenuItem, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            if (closeBurger) toggleBurger();
                            scrollToSectionById(item.link);
                        }}
                        className="text-white cursor-pointer hover:scale-105 transitioned"
                    >
                        {item.name}
                    </button>
                ))}
                <Auth />
            </>
        )
    }

    return (
        <header className="relative z-100">
            <div className="fixed w-full h-20 bg-(image:--color-fixed)">
                <div className="myContainer flex justify-between gap-4 items-center h-full">
                    <a href="./" className="logo transitioned hover:scale-105 flex items-center gap-2">
                        <img className="w-[50px] h-[50px]" src="./logo.png" alt="logo" />
                        <h3 className="fontTitle text-2xl text-white font-black">CoinRadar</h3>
                    </a>

                    {!isMobile ? (
                        <div className="flex gap-10 items-center">{renderMenuButtons()}</div>
                    ) : (
                        <button onClick={toggleBurger} className="group w-9 rounded-lg border-0 cursor-pointer">
                            <div className="grid justify-items-center gap-1.5">
                                {["rotate-45 translate-y-2.5", "scale-x-0", "-rotate-45 -translate-y-2.5"].map(
                                    (cls, i) => (
                                        <span
                                            key={i}
                                            className={`h-1 w-9 bg-(--color-text) rounded-full transition-all duration-500 ${isBurgerOpen ? cls : ""
                                                }`}
                                        ></span>
                                    )
                                )}
                            </div>
                        </button>
                    )}

                    <div
                        className={`fixed top-20 left-0 h-[calc(100vh-80px)] w-full z-50 transition-transform transitioned bg-black/75 text-white ${isBurgerOpen ? "translate-x-0" : "-translate-x-full"
                            }`}
                    >
                        <div className="flex flex-col items-center justify-center gap-20 py-15 text-3xl">
                            {renderMenuButtons(true)}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
