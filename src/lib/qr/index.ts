"use server";

import QRCode from "qrcode";

export async function generateQR(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 256,
      margin: 2,
      color: {
        dark: "#1e293b",
        light: "#ffffff",
      },
    });
  } catch {
    return "";
  }
}
