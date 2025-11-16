declare module 'jsbarcode' {
  interface JsBarcodeOptions {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    font?: string;
    textMargin?: number;
    margin?: number;
  }

  type JsBarcodeInstance = (
    element: HTMLCanvasElement | SVGElement,
    data: string,
    options?: JsBarcodeOptions
  ) => void;

  const JsBarcode: JsBarcodeInstance;
  export default JsBarcode;
}
