import { SwitchTheme } from "./SwitchTheme";

export function FixedFooter() {
    return (
        <footer className="h-[80px] w-full bg-[image:var(--color-fixed)] ">
            <div className="myContainer h-full flex justify-between items-center">
                <h3 className="text-white">All rights reserved</h3>
                <SwitchTheme />
            </div>
        </footer>
    )
}