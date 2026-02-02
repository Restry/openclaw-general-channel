import type { ChannelOutboundAdapter } from "openclaw/plugin-sdk";
import { getGenericRuntime } from "./runtime.js";
import { sendMessageGeneric, sendMediaGeneric } from "./send.js";

export const genericOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: (text, limit) => getGenericRuntime().channel.text.chunkMarkdownText(text, limit),
  chunkerMode: "markdown",
  textChunkLimit: 4000,
  sendText: async ({ cfg, to, text }) => {
    const result = await sendMessageGeneric({ cfg, to, text });
    return { channel: "openclaw-general-channel", ...result };
  },
  sendMedia: async ({ cfg, to, text, mediaUrl, mediaType }) => {
    // Determine content type from mediaType - preserve voice vs audio distinction
    let contentType: "image" | "voice" | "audio" | undefined;
    if (mediaType === "image") {
      contentType = "image";
    } else if (mediaType === "voice") {
      contentType = "voice";
    } else if (mediaType === "audio") {
      contentType = "audio";
    }

    if (contentType && mediaUrl) {
      const result = await sendMediaGeneric({
        cfg,
        to,
        mediaUrl,
        mediaType: contentType,
        caption: text,
      });
      return { channel: "openclaw-general-channel", ...result };
    }

    // Fallback: send media URL as text
    let fullText = text ?? "";
    if (mediaUrl) {
      fullText = fullText ? `${fullText}\n\n📎 ${mediaUrl}` : `📎 ${mediaUrl}`;
    }

    const result = await sendMessageGeneric({ cfg, to, text: fullText });
    return { channel: "openclaw-general-channel", ...result };
  },
};
