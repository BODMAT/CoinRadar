import { useEffect } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
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
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [active]);


    if (!active) return null;

    return ReactDOM.createPortal(
        <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-[#0000008e] bg-opacity-50 !z-[99999] flex justify-center items-center"
        >
            <motion.div
                initial={{ opacity: 0, y: "-50px" }}
                animate={{ opacity: 1, y: "0px" }}
                exit={{ opacity: 0, y: "-50px" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-white rounded-lg w-[90%] max-w-[700px] shadow-lg relative !z-[99999] max-md:mt-[5vh] overflow-hidden"
            >
                <div className="bg-[#121212] flex justify-between items-center p-4">
                    <h2 className="fontTitle text-2xl font-bold text-white">{title}</h2>
                    <button onClick={() => dispatch(closePopup())} className="text-2xl font-bold cursor-pointer">
                        <img src={crossSVG} alt="Close" />
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </motion.div>
        </motion.section>,
        document.body
    );
}
