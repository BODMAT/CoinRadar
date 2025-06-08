import { motion } from "framer-motion";
import NewsLetterSVG from "../../assets/newsletter.svg";
import { useTypeWriter } from "../../hooks/useTypeWriter";
import { DATA, type TextBlock } from "./data";
import { blockFromLeftAnimation, blockFromRightAnimation } from "../../utils/animatioms";
export function HomePage() {

    return (
        <motion.div
            initial={"hidden"}
            whileInView={"visible"}
            viewport={{ once: true, amount: 0.2 }}
            className="flex justify-between items-center gap-35 pt-10 max-lg:flex-col max-lg:items-center max-lg:text-center max-lg:justify-center max-lg:gap-5">
            <div className="flex-3/5 max-lg:flex-1">
                {DATA.map((textBlock: TextBlock, index: number) => {
                    return (
                        <motion.div
                            key={index}
                            variants={blockFromLeftAnimation}
                            custom={index}
                            className="transitioned relative mb-3 p-4 rounded-2xl bg-[var(--color-card)] text-white 
                       first:font-black first:text-3xl lg:first:w-fit
                       shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.4)]
                       hover:scale-[1.02] transitioned
                       backdrop-blur-md border border-white/10"
                        >
                            {useTypeWriter(textBlock.text, 1000, index * 1000)}
                        </motion.div>
                    );
                })}

            </div>
            <motion.div variants={blockFromRightAnimation} className="">
                <img className="w-full" src={NewsLetterSVG} alt="NewsLetterSVG" />
            </motion.div>
        </motion.div>
    )
}