// page-flip paketi (StPageFlip) tip bildirimi içermiyor; yalnızca kullandığımız yüzey tanımlandı.
declare module "page-flip" {
  export type FlipSetting = {
    startPage: number;
    size: "fixed" | "stretch";
    width: number;
    height: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    drawShadow: boolean;
    flippingTime: number;
    usePortrait: boolean;
    startZIndex: number;
    autoSize: boolean;
    maxShadowOpacity: number;
    showCover: boolean;
    mobileScrollSupport: boolean;
    clickEventForward: boolean;
    useMouseEvents: boolean;
    swipeDistance: number;
    showPageCorners: boolean;
    disableFlipByClick: boolean;
  };
  export type FlipEvent<T = unknown> = { data: T; object: PageFlip };
  export class PageFlip {
    constructor(element: HTMLElement, settings: Partial<FlipSetting>);
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    destroy(): void;
    update(): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    flip(page: number, corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): "portrait" | "landscape";
    getState(): "user_fold" | "fold_corner" | "flipping" | "read";
    getSettings(): FlipSetting;
    getRender(): { render: (time: number) => void };
    on(event: "flip", cb: (e: FlipEvent<number>) => void): PageFlip;
    on(event: "init", cb: (e: FlipEvent<{ page: number; mode: string }>) => void): PageFlip;
    on(event: "changeOrientation", cb: (e: FlipEvent<string>) => void): PageFlip;
    on(event: "changeState", cb: (e: FlipEvent<string>) => void): PageFlip;
  }
}
