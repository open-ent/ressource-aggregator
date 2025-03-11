import { FC, SVGAttributes } from "react";

export type CustomSVGProps = SVGAttributes<SVGSVGElement>;
export type SVGComponent = FC<CustomSVGProps>;
export type SVGProp = { component: SVGComponent; props?: CustomSVGProps };
