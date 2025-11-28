import { motion } from "framer-motion";
import NewsLetterSVG from "../../assets/newsletter.svg";
import { DATA, type TextBlock, BTNDATA } from "./data";
import { blockFromLeftAnimation, blockFromRightAnimation } from "../../utils/animations";
import { useAppDispatch } from "../../store";
import { openPopup } from "../../portals/popup.slice";
import { useRAFDelay } from "../../hooks/useRAFDelay";
export function HomePage() {
    const dispatch = useAppDispatch();
    const canAnimate = useRAFDelay(100);
    function handleOnenPopup() {
        dispatch(openPopup({ title: BTNDATA.title, children: BTNDATA.children }));
    }
    return (
        <motion.div
            initial={canAnimate ? "hidden" : "visible"}
            whileInView={canAnimate ? "visible" : "hidden"}
            viewport={{ once: true, amount: 0.2 }}
            className="myContainer min-h-[90vh] flex justify-between items-center gap-35 pt-[90px] max-lg:flex-col max-lg:items-center max-lg:text-center max-lg:justify-center max-lg:gap-5">
            <div className="flex-3/5 max-lg:flex-1">
                {DATA.map((textBlock: TextBlock, index: number) => {
                    return (
                        <motion.div
                            key={index}
                            variants={blockFromLeftAnimation}
                            custom={index / 6}
                            className="translate-z-0 transitioned relative mb-3 p-4 rounded-2xl bg-(--color-card) text-white 
                       first:font-black first:text-3xl
                       shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.4)]
                       hover:scale-[1.02] transitioned
                       backdrop-blur-md border border-white/10"
                        >
                            {textBlock.text}
                        </motion.div>
                    );
                })}
                <motion.button onClick={handleOnenPopup} custom={0.5} variants={blockFromLeftAnimation} className="transitioned relative p-4 rounded-2xl bg-[var-(--color-card)] text-white 
                       font-black text-2xl cursor-pointer border-3
                       shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.4)]
                       hover:scale-[1.02] transitioned
                       backdrop-blur-md border-white/30">{BTNDATA.short}</motion.button>
            </div>
            <motion.div variants={blockFromRightAnimation} className="w-full flex-2/5">
                <img className="w-full" src={NewsLetterSVG} alt="NewsLetterSVG" />
            </motion.div>
        </motion.div>
    )
}