export function normalizePhoneForSMS(phone: string): string {
  const clean = phone.replace(/\D/g, "")
  if (clean.length === 10 && clean.startsWith("0")) {
    return "94" + clean.substring(1)
  }
  if (clean.length === 9) {
    return "94" + clean
  }
  return clean
}

export async function sendSMS(recipient: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedRecipient = normalizePhoneForSMS(recipient)
    const response = await fetch("https://app.text.lk/api/http/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        api_token: process.env.TEXT_LK_API_TOKEN,
        recipient: formattedRecipient,
        sender_id: process.env.TEXT_LK_SENDER_ID || "TextLKDemo",
        type: "plain",
        message,
      }),
    })

    const data = await response.json()
    if (data.status !== "success") {
      console.error("Text.lk API returned error:", data)
      return { success: false, error: data.message || "Failed to send SMS." }
    }
    
    return { success: true }
  } catch (error: any) {
    console.error("Error communicating with SMS Gateway:", error)
    return { success: false, error: "Failed to connect to SMS service." }
  }
}
