import { useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import crossSVG from "../assets/cross.svg";
import { closePopup } from "../portals/popup.slice";
import { useAppDispatch, useAppSelector } from "../store";

export function PopUp() {
    const active = useAppSelector((state) => state.popup.isOpen);
    const title = useAppSelector((state) => state.popup.title);
    const children = useAppSelector((state) => state.popup.children);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (active) {
            document.body.style.overflow = "hidden";
            document.body.style.height = "100vh";
        } else {
            document.body.style.overflow = "";
            document.body.style.height = "";
        }

        return () => {
            document.body.style.overflow = "";
            document.body.style.height = "";
        };
    }, [active]);

    return ReactDOM.createPortal(
        <AnimatePresence>
            {active && (
                <motion.section
                    key="popup"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 bg-[#0000008e] flex justify-center items-center !z-[99999]"
                >
                    <motion.div
                        key="popup-content"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="bg-white rounded-lg w-[90%] max-w-[700px] shadow-lg relative !z-[999999] max-md:mt-[5vh] max-h-[80vh] flex flex-col"
                    >
                        <div className="bg-[#121212] flex justify-between items-center p-4 flex-shrink-0">
                            <h2 className="fontTitle text-2xl font-bold text-white">{title}</h2>
                            <button
                                onClick={() => dispatch(closePopup())}
                                className="text-2xl font-bold cursor-pointer"
                            >
                                <img src={crossSVG} alt="Close" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto overflow-x-hidden flex-1">
                            {children}
                        </div>
                    </motion.div>

                </motion.section>
            )}
        </AnimatePresence>,
        document.body
    );
}
