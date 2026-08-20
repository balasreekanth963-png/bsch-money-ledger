import { buildWhatsAppLink } from "@/lib/utils/whatsapp";

export default function WhatsAppLinkButton({
  mobile,
  message,
  label = "WhatsApp",
}: {
  mobile: string | null | undefined;
  message: string;
  label?: string;
}) {
  const href = buildWhatsAppLink(mobile, message);

  if (!href) {
    return (
      <span className="text-[11px] text-ink-400">No mobile number on file</span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white transition active:scale-[0.98]"
    >
      💬 {label}
    </a>
  );
}
